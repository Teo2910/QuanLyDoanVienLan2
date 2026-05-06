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
    trustServerCertificate: true, // For local dev
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
  } catch (err) {
    console.error("SQL Server Connection Failed: ", err);
    // In preview environment, this will likely fail because localhost:1433 doesn't exist
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
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const result = await pool.request().query("SELECT * FROM units");
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.post("/api/units", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const { id, name, code, address, phone, email, createdAt } = req.body;
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("name", sql.NVarChar, name)
        .input("code", sql.NVarChar, code || null)
        .input("address", sql.NVarChar, address || null)
        .input("phone", sql.NVarChar, phone || null)
        .input("email", sql.NVarChar, email || null)
        .input("createdAt", sql.BigInt, createdAt)
        .query("INSERT INTO units (id, name, code, address, phone, email, createdAt) VALUES (@id, @name, @code, @address, @phone, @email, @createdAt)");
      
      io.emit("units:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  // Members
  app.get("/api/members", async (req, res) => {
    try {
      if (!pool || !pool.connected) {
        // Return empty array and warning instead of 500 to keep UI functional but alert user
        return res.json([]); 
      }
      const result = await pool.request().query("SELECT * FROM members");
      const formattedMembers = result.recordset.map(m => ({
        ...m,
        statusHistory: m.statusHistory ? JSON.parse(m.statusHistory) : [],
        isOutstanding: !!m.isOutstanding
      }));
      res.json(formattedMembers);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.post("/api/members", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const m = req.body;
      await pool.request()
        .input("id", sql.NVarChar, m.id)
        .input("fullName", sql.NVarChar, m.fullName)
        .input("memberId", sql.NVarChar, m.memberId)
        .input("dob", sql.NVarChar, m.dob)
        .input("gender", sql.NVarChar, m.gender)
        .input("ethnic", sql.NVarChar, m.ethnic || null)
        .input("religion", sql.NVarChar, m.religion || null)
        .input("placeOfBirth", sql.NVarChar, m.placeOfBirth || null)
        .input("hometown", sql.NVarChar, m.hometown || null)
        .input("permanentAddress", sql.NVarChar, m.permanentAddress || null)
        .input("joinDate", sql.NVarChar, m.joinDate || null)
        .input("unitId", sql.NVarChar, m.unitId)
        .input("email", sql.NVarChar, m.email || null)
        .input("phone", sql.NVarChar, m.phone || null)
        .input("academicYear", sql.NVarChar, m.academicYear || null)
        .input("professionalLevel", sql.NVarChar, m.professionalLevel || null)
        .input("position", sql.NVarChar, m.position || null)
        .input("achievementLevel", sql.NVarChar, m.achievementLevel)
        .input("status", sql.NVarChar, m.status)
        .input("statusHistory", sql.NVarChar, JSON.stringify(m.statusHistory || []))
        .input("isOutstanding", sql.Bit, m.isOutstanding)
        .input("createdAt", sql.BigInt, m.createdAt)
        .query(`
          INSERT INTO members (id, fullName, memberId, dob, gender, ethnic, religion, placeOfBirth, hometown, permanentAddress, joinDate, unitId, email, phone, academicYear, professionalLevel, position, achievementLevel, status, statusHistory, isOutstanding, createdAt)
          VALUES (@id, @fullName, @memberId, @dob, @gender, @ethnic, @religion, @placeOfBirth, @hometown, @permanentAddress, @joinDate, @unitId, @email, @phone, @academicYear, @professionalLevel, @position, @achievementLevel, @status, @statusHistory, @isOutstanding, @createdAt)
        `);
      
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.put("/api/members/:id", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const { id } = req.params;
      const m = req.body;
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("fullName", sql.NVarChar, m.fullName)
        .input("memberId", sql.NVarChar, m.memberId)
        .input("dob", sql.NVarChar, m.dob)
        .input("gender", sql.NVarChar, m.gender)
        .input("ethnic", sql.NVarChar, m.ethnic || null)
        .input("religion", sql.NVarChar, m.religion || null)
        .input("placeOfBirth", sql.NVarChar, m.placeOfBirth || null)
        .input("hometown", sql.NVarChar, m.hometown || null)
        .input("permanentAddress", sql.NVarChar, m.permanentAddress || null)
        .input("joinDate", sql.NVarChar, m.joinDate || null)
        .input("unitId", sql.NVarChar, m.unitId)
        .input("email", sql.NVarChar, m.email || null)
        .input("phone", sql.NVarChar, m.phone || null)
        .input("academicYear", sql.NVarChar, m.academicYear || null)
        .input("professionalLevel", sql.NVarChar, m.professionalLevel || null)
        .input("position", sql.NVarChar, m.position || null)
        .input("achievementLevel", sql.NVarChar, m.achievementLevel)
        .input("status", sql.NVarChar, m.status)
        .input("statusHistory", sql.NVarChar, JSON.stringify(m.statusHistory || []))
        .input("isOutstanding", sql.Bit, m.isOutstanding)
        .query(`
          UPDATE members SET 
            fullName = @fullName, memberId = @memberId, dob = @dob, gender = @gender,
            ethnic = @ethnic, religion = @religion, placeOfBirth = @placeOfBirth,
            hometown = @hometown, permanentAddress = @permanentAddress,
            joinDate = @joinDate, unitId = @unitId, 
            email = @email, phone = @phone, academicYear = @academicYear,
            professionalLevel = @professionalLevel, position = @position,
            achievementLevel = @achievementLevel, status = @status,
            statusHistory = @statusHistory, isOutstanding = @isOutstanding
          WHERE id = @id
        `);
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.delete("/api/members/:id", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      await pool.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM members WHERE id = @id");
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.post("/api/members/bulk-delete", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Invalid IDs" });
      
      const idList = ids.map(id => `'${id.replace(/'/g, "''")}'`).join(",");
      const result = await pool.request().query(`DELETE FROM members WHERE id IN (${idList})`);
      
      console.log(`Bulk delete successful. Rows affected: ${result.rowsAffected[0]}`);
      io.emit("members:changed");
      res.json({ success: true, rowsAffected: result.rowsAffected[0] });
    } catch (err) {
      console.error("Bulk delete error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.patch("/api/members/:id/outstanding", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const { id } = req.params;
      const { isOutstanding } = req.body;
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("isOutstanding", sql.Bit, isOutstanding)
        .query("UPDATE members SET isOutstanding = @isOutstanding WHERE id = @id");
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
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
