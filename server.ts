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

const dbConfig: sql.config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "your_password",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_DATABASE || "QuanLyDoanVien",
  port: parseInt(process.env.DB_PORT || "1433"),
  options: {
    encrypt: true, // For Azure
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true", 
  },
};

let pool: sql.ConnectionPool;

async function connectDb() {
  try {
    pool = await sql.connect(dbConfig);
    console.log("Connected to SQL Server");
// ... (schema init code follows in the file, but I'm editing a block)
    
    // Initialize Schema
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='units' AND xtype='U')
      CREATE TABLE units (
        id NVARCHAR(50) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        code NVARCHAR(50) NOT NULL,
        address NVARCHAR(MAX),
        phone NVARCHAR(50),
        email NVARCHAR(255),
        createdAt BIGINT NOT NULL
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='members' AND xtype='U')
      CREATE TABLE members (
        id NVARCHAR(50) PRIMARY KEY,
        fullName NVARCHAR(255) NOT NULL,
        memberId NVARCHAR(50) NOT NULL,
        dob NVARCHAR(50) NOT NULL,
        gender NVARCHAR(20) NOT NULL,
        ethnic NVARCHAR(50),
        hometown NVARCHAR(MAX),
        joinDate NVARCHAR(50),
        unitId NVARCHAR(50) NOT NULL,
        email NVARCHAR(255),
        phone NVARCHAR(50),
        academicYear NVARCHAR(50),
        achievementLevel NVARCHAR(50),
        status NVARCHAR(50) NOT NULL,
        statusHistory NVARCHAR(MAX), -- JSON string
        isOutstanding BIT DEFAULT 0,
        createdAt BIGINT NOT NULL
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
      CREATE TABLE users (
        uid NVARCHAR(50) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL,
        password NVARCHAR(255),
        role NVARCHAR(50) NOT NULL,
        fullName NVARCHAR(255),
        avatarUrl NVARCHAR(MAX),
        unitId NVARCHAR(50),
        presets NVARCHAR(MAX) -- JSON string
      );

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'fullName')
      ALTER TABLE users ADD fullName NVARCHAR(255);
      
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'avatarUrl')
      ALTER TABLE users ADD avatarUrl NVARCHAR(MAX);

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'phone')
      ALTER TABLE users ADD phone NVARCHAR(50);

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('members') AND name = 'isOutstanding')
      ALTER TABLE members ADD isOutstanding BIT DEFAULT 0;

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='activities' AND xtype='U')
      CREATE TABLE activities (
        id NVARCHAR(50) PRIMARY KEY,
        title NVARCHAR(255) NOT NULL,
        date NVARCHAR(50) NOT NULL,
        location NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        type NVARCHAR(50) NOT NULL,
        createdAt BIGINT NOT NULL
      );

      -- Add default admin user if not exists
      IF NOT EXISTS (SELECT * FROM users)
      INSERT INTO users (uid, email, password, role, fullName, avatarUrl, phone)
      VALUES ('admin-id', 'admin@gmail.com', 'admin', 'admin', 'Admin System', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', '0900000000');
    `);
  } catch (err) {
    console.error("SQL Server Connection Failed: ", err);
  }
}

async function startServer() {
  await connectDb();

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  const PORT = 3000;

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
      res.status(500).json({ error: "Database error" });
    }
  });

  // Units
  app.get("/api/units", async (req, res) => {
    try {
      const result = await pool.request().query("SELECT * FROM units");
      res.json(result.recordset);
    } catch (err) {
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
      res.status(500).json({ error: "Database error" });
    }
  });

  // Members
  app.get("/api/members", async (req, res) => {
    try {
      const result = await pool.request().query("SELECT * FROM members");
      const members = result.recordset.map((m: any) => ({
        ...m,
        statusHistory: m.statusHistory ? JSON.parse(m.statusHistory) : []
      }));
      res.json(members);
    } catch (err) {
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
        .input("hometown", sql.NVarChar, m.hometown)
        .input("joinDate", sql.NVarChar, m.joinDate)
        .input("unitId", sql.NVarChar, m.unitId)
        .input("email", sql.NVarChar, m.email)
        .input("phone", sql.NVarChar, m.phone)
        .input("academicYear", sql.NVarChar, m.academicYear)
        .input("achievementLevel", sql.NVarChar, m.achievementLevel)
        .input("status", sql.NVarChar, m.status)
        .input("statusHistory", sql.NVarChar, JSON.stringify(m.statusHistory || []))
        .input("isOutstanding", sql.Bit, m.isOutstanding ? 1 : 0)
        .input("createdAt", sql.BigInt, m.createdAt)
        .query(`
          INSERT INTO members (id, fullName, memberId, dob, gender, ethnic, hometown, joinDate, unitId, email, phone, academicYear, achievementLevel, status, statusHistory, isOutstanding, createdAt)
          VALUES (@id, @fullName, @memberId, @dob, @gender, @ethnic, @hometown, @joinDate, @unitId, @email, @phone, @academicYear, @achievementLevel, @status, @statusHistory, @isOutstanding, @createdAt)
        `);
      
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
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
        .input("hometown", sql.NVarChar, m.hometown)
        .input("joinDate", sql.NVarChar, m.joinDate)
        .input("unitId", sql.NVarChar, m.unitId)
        .input("email", sql.NVarChar, m.email)
        .input("phone", sql.NVarChar, m.phone)
        .input("academicYear", sql.NVarChar, m.academicYear)
        .input("achievementLevel", sql.NVarChar, m.achievementLevel)
        .input("status", sql.NVarChar, m.status)
        .input("statusHistory", sql.NVarChar, JSON.stringify(m.statusHistory || []))
        .input("isOutstanding", sql.Bit, m.isOutstanding ? 1 : 0)
        .query(`
          UPDATE members SET 
            fullName = @fullName, memberId = @memberId, dob = @dob, gender = @gender, 
            ethnic = @ethnic, hometown = @hometown, joinDate = @joinDate, unitId = @unitId, 
            email = @email, phone = @phone, academicYear = @academicYear, 
            achievementLevel = @achievementLevel, status = @status, statusHistory = @statusHistory,
            isOutstanding = @isOutstanding
          WHERE id = @id
        `);
      
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
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
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { uid, email, password, role, fullName, avatarUrl, phone, unitId, presets } = req.body;
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
          IF EXISTS (SELECT * FROM users WHERE uid = @uid)
            UPDATE users SET email = @email, password = @password, role = @role, fullName = @fullName, avatarUrl = @avatarUrl, phone = @phone, unitId = @unitId, presets = @presets WHERE uid = @uid
          ELSE
            INSERT INTO users (uid, email, password, role, fullName, avatarUrl, phone, unitId, presets) VALUES (@uid, @email, @password, @role, @fullName, @avatarUrl, @phone, @unitId, @presets)
        `);
      res.json({ success: true });
    } catch (err) {
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
      res.status(500).json({ error: "Database error" });
    }
  });

  // Activities
  app.get("/api/activities", async (req, res) => {
    try {
      const result = await pool.request().query("SELECT * FROM activities");
      res.json(result.recordset);
    } catch (err) {
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
