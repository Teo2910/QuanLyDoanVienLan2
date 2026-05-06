import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import sql from "mssql";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlConfig: sql.config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "your_strong_password",
  database: process.env.DB_DATABASE || "QuanLyDoanVien",
  server: process.env.DB_SERVER || "localhost",
  port: parseInt(process.env.DB_PORT || "1433"),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // For Azure
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true", // change to true for local dev / self-signed certs
  }
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  const PORT = 3000;

  // Initialize MSSQL
  let pool: sql.ConnectionPool;
  try {
    console.log(`Attempting to connect to SQL Server at ${sqlConfig.server}:${sqlConfig.port}...`);
    pool = await sql.connect(sqlConfig);
    console.log("Connected to SQL Server successfully.");

    // Auto-migration: Ensure all required columns exist
    const columnsToEnsure = [
      { name: "ethnic", type: "NVARCHAR(MAX)" },
      { name: "religion", type: "NVARCHAR(MAX)" },
      { name: "placeOfBirth", type: "NVARCHAR(MAX)" },
      { name: "permanentAddress", type: "NVARCHAR(MAX)" },
      { name: "professionalLevel", type: "NVARCHAR(MAX)" },
      { name: "position", type: "NVARCHAR(MAX)" }
    ];

    for (const col of columnsToEnsure) {
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('members') AND name = '${col.name}')
          BEGIN
            ALTER TABLE members ADD ${col.name} ${col.type};
          END
        `);
      } catch (colErr) {
        console.warn(`Could not add column ${col.name}:`, colErr.message);
      }
    }
  } catch (err) {
    console.error("SQL Server Connection Failed: ", err);
    // If it fails, the server should still start to serve frontend, but APIs will return 500
  }

  app.use(express.json());

  // API Routes
  
  // Auth Login
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await pool.request()
        .input("email", sql.NVarChar, email)
        .input("password", sql.NVarChar, password)
        .query("SELECT * FROM users WHERE email = @email AND password = @password");
      
      const user = result.recordset[0];
      if (user) {
        if (user.presets) user.presets = JSON.parse(user.presets);
        // Don't send password back
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } else {
        res.status(401).json({ error: "Email hoặc mật khẩu không chính xác" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Units
  app.get("/api/units", async (req, res) => {
    try {
      const result = await pool.request().query("SELECT * FROM units");
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/units", async (req, res) => {
    try {
      const { id, name, code, address, phone, email, createdAt } = req.body;
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("name", sql.NVarChar, name)
        .input("code", sql.NVarChar, code)
        .input("address", sql.NVarChar, address)
        .input("phone", sql.NVarChar, phone)
        .input("email", sql.NVarChar, email)
        .input("createdAt", sql.BigInt, createdAt)
        .query("INSERT INTO units (id, name, code, address, phone, email, createdAt) VALUES (@id, @name, @code, @address, @phone, @email, @createdAt)");
      
      io.emit("units:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/units/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, address, phone, email } = req.body;
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("name", sql.NVarChar, name)
        .input("code", sql.NVarChar, code)
        .input("address", sql.NVarChar, address)
        .input("phone", sql.NVarChar, phone)
        .input("email", sql.NVarChar, email)
        .query("UPDATE units SET name = @name, code = @code, address = @address, phone = @phone, email = @email WHERE id = @id");
      
      io.emit("units:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    try {
      await pool.request()
        .input("id", sql.NVarChar, req.params.id)
        .query("DELETE FROM units WHERE id = @id");
      io.emit("units:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Members
  app.get("/api/members", async (req, res) => {
    try {
      const result = await pool.request().query("SELECT * FROM members");
      const members = result.recordset;
      const formattedMembers = members.map((m: any) => ({
        ...m,
        statusHistory: m.statusHistory ? JSON.parse(m.statusHistory) : [],
        isOutstanding: !!m.isOutstanding
      }));
      res.json(formattedMembers);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/members", async (req, res) => {
    try {
      const m = req.body;
      await pool.request()
        .input("id", sql.NVarChar, m.id)
        .input("fullName", sql.NVarChar, m.fullName)
        .input("memberId", sql.NVarChar, m.memberId)
        .input("dob", sql.NVarChar, m.dob)
        .input("gender", sql.NVarChar, m.gender)
        .input("ethnic", sql.NVarChar, m.ethnic)
        .input("religion", sql.NVarChar, m.religion)
        .input("placeOfBirth", sql.NVarChar, m.placeOfBirth)
        .input("hometown", sql.NVarChar, m.hometown)
        .input("permanentAddress", sql.NVarChar, m.permanentAddress)
        .input("joinDate", sql.NVarChar, m.joinDate)
        .input("unitId", sql.NVarChar, m.unitId)
        .input("email", sql.NVarChar, m.email)
        .input("phone", sql.NVarChar, m.phone)
        .input("academicYear", sql.NVarChar, m.academicYear)
        .input("professionalLevel", sql.NVarChar, m.professionalLevel)
        .input("position", sql.NVarChar, m.position)
        .input("achievementLevel", sql.NVarChar, m.achievementLevel)
        .input("status", sql.NVarChar, m.status)
        .input("statusHistory", sql.NVarChar, JSON.stringify(m.statusHistory || []))
        .input("isOutstanding", sql.Bit, m.isOutstanding ? 1 : 0)
        .input("createdAt", sql.BigInt, m.createdAt)
        .query(`
          INSERT INTO members (id, fullName, memberId, dob, gender, ethnic, religion, placeOfBirth, hometown, permanentAddress, joinDate, unitId, email, phone, academicYear, professionalLevel, position, achievementLevel, status, statusHistory, isOutstanding, createdAt)
          VALUES (@id, @fullName, @memberId, @dob, @gender, @ethnic, @religion, @placeOfBirth, @hometown, @permanentAddress, @joinDate, @unitId, @email, @phone, @academicYear, @professionalLevel, @position, @achievementLevel, @status, @statusHistory, @isOutstanding, @createdAt)
        `);
      
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const m = req.body;
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("fullName", sql.NVarChar, m.fullName)
        .input("memberId", sql.NVarChar, m.memberId)
        .input("dob", sql.NVarChar, m.dob)
        .input("gender", sql.NVarChar, m.gender)
        .input("ethnic", sql.NVarChar, m.ethnic)
        .input("religion", sql.NVarChar, m.religion)
        .input("placeOfBirth", sql.NVarChar, m.placeOfBirth)
        .input("hometown", sql.NVarChar, m.hometown)
        .input("permanentAddress", sql.NVarChar, m.permanentAddress)
        .input("joinDate", sql.NVarChar, m.joinDate)
        .input("unitId", sql.NVarChar, m.unitId)
        .input("email", sql.NVarChar, m.email)
        .input("phone", sql.NVarChar, m.phone)
        .input("academicYear", sql.NVarChar, m.academicYear)
        .input("professionalLevel", sql.NVarChar, m.professionalLevel)
        .input("position", sql.NVarChar, m.position)
        .input("achievementLevel", sql.NVarChar, m.achievementLevel)
        .input("status", sql.NVarChar, m.status)
        .input("statusHistory", sql.NVarChar, JSON.stringify(m.statusHistory || []))
        .input("isOutstanding", sql.Bit, m.isOutstanding ? 1 : 0)
        .query(`
          UPDATE members SET 
            fullName = @fullName, memberId = @memberId, dob = @dob, gender = @gender, 
            ethnic = @ethnic, religion = @religion, placeOfBirth = @placeOfBirth,
            hometown = @hometown, permanentAddress = @permanentAddress,
            joinDate = @joinDate, unitId = @unitId, 
            email = @email, phone = @phone, academicYear = @academicYear, professionalLevel = @professionalLevel,
            position = @position, achievementLevel = @achievementLevel, status = @status, statusHistory = @statusHistory,
            isOutstanding = @isOutstanding
          WHERE id = @id
        `);
      
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.delete("/api/members/:id", async (req, res) => {
    try {
      await pool.request()
        .input("id", sql.NVarChar, req.params.id)
        .query("DELETE FROM members WHERE id = @id");
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/members/:id/outstanding", async (req, res) => {
    try {
      const { id } = req.params;
      const { isOutstanding } = req.body;
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("isOutstanding", sql.Bit, isOutstanding ? 1 : 0)
        .query("UPDATE members SET isOutstanding = @isOutstanding WHERE id = @id");
      
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Users / Profiles
  app.get("/api/users/:uid", async (req, res) => {
    try {
      const result = await pool.request()
        .input("uid", sql.NVarChar, req.params.uid)
        .query("SELECT * FROM users WHERE uid = @uid");
      const user = result.recordset[0];
      if (user && user.presets) user.presets = JSON.parse(user.presets);
      res.json(user || null);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/users/by-email/:email", async (req, res) => {
    try {
      const result = await pool.request()
        .input("email", sql.NVarChar, req.params.email)
        .query("SELECT * FROM users WHERE email = @email");
      const user = result.recordset[0];
      if (user && user.presets) user.presets = JSON.parse(user.presets);
      res.json(user || null);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { uid, email, password, role, fullName, avatarUrl, phone, unitId, presets } = req.body;
      const existingResult = await pool.request()
        .input("uid", sql.NVarChar, uid)
        .query("SELECT uid FROM users WHERE uid = @uid");
      const existing = existingResult.recordset[0];
      
      if (existing) {
        await pool.request()
          .input("uid", sql.NVarChar, uid)
          .input("email", sql.NVarChar, email)
          .input("password", sql.NVarChar, password)
          .input("role", sql.NVarChar, role)
          .input("fullName", sql.NVarChar, fullName)
          .input("avatarUrl", sql.NVarChar, avatarUrl)
          .input("phone", sql.NVarChar, phone)
          .input("unitId", sql.NVarChar, unitId)
          .input("presets", sql.NVarChar, JSON.stringify(presets || []))
          .query(`
            UPDATE users SET 
              email = @email, password = @password, role = @role, fullName = @fullName, 
              avatarUrl = @avatarUrl, phone = @phone, unitId = @unitId, presets = @presets 
            WHERE uid = @uid
          `);
      } else {
        await pool.request()
          .input("uid", sql.NVarChar, uid)
          .input("email", sql.NVarChar, email)
          .input("password", sql.NVarChar, password)
          .input("role", sql.NVarChar, role)
          .input("fullName", sql.NVarChar, fullName)
          .input("avatarUrl", sql.NVarChar, avatarUrl)
          .input("phone", sql.NVarChar, phone)
          .input("unitId", sql.NVarChar, unitId)
          .input("presets", sql.NVarChar, JSON.stringify(presets || []))
          .query(`
            INSERT INTO users (uid, email, password, role, fullName, avatarUrl, phone, unitId, presets) 
            VALUES (@uid, @email, @password, @role, @fullName, @avatarUrl, @phone, @unitId, @presets)
          `);
      }
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/users/:uid/profile", async (req, res) => {
    try {
      const { uid } = req.params;
      const { fullName, avatarUrl, email, phone } = req.body;
      await pool.request()
        .input("uid", sql.NVarChar, uid)
        .input("fullName", sql.NVarChar, fullName)
        .input("avatarUrl", sql.NVarChar, avatarUrl)
        .input("email", sql.NVarChar, email)
        .input("phone", sql.NVarChar, phone)
        .query("UPDATE users SET fullName = @fullName, avatarUrl = @avatarUrl, email = @email, phone = @phone WHERE uid = @uid");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/users/:uid/presets", async (req, res) => {
    try {
      const { uid } = req.params;
      const { presets } = req.body;
      await pool.request()
        .input("uid", sql.NVarChar, uid)
        .input("presets", sql.NVarChar, JSON.stringify(presets))
        .query("UPDATE users SET presets = @presets WHERE uid = @uid");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Activities
  app.get("/api/activities", async (req, res) => {
    try {
      const result = await pool.request().query("SELECT * FROM activities");
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const { id, title, date, location, description, type, createdAt } = req.body;
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("title", sql.NVarChar, title)
        .input("date", sql.NVarChar, date)
        .input("location", sql.NVarChar, location)
        .input("description", sql.NVarChar, description)
        .input("type", sql.NVarChar, type)
        .input("createdAt", sql.BigInt, createdAt)
        .query("INSERT INTO activities (id, title, date, location, description, type, createdAt) VALUES (@id, @title, @date, @location, @description, @type, @createdAt)");
      
      io.emit("activities:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/activities/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, date, location, description, type } = req.body;
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("title", sql.NVarChar, title)
        .input("date", sql.NVarChar, date)
        .input("location", sql.NVarChar, location)
        .input("description", sql.NVarChar, description)
        .input("type", sql.NVarChar, type)
        .query("UPDATE activities SET title = @title, date = @date, location = @location, description = @description, type = @type WHERE id = @id");
      
      io.emit("activities:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.delete("/api/activities/:id", async (req, res) => {
    try {
      await pool.request()
        .input("id", sql.NVarChar, req.params.id)
        .query("DELETE FROM activities WHERE id = @id");
      io.emit("activities:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

