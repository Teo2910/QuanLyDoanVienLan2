import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("data.db");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    memberId TEXT NOT NULL,
    dob TEXT NOT NULL,
    gender TEXT NOT NULL,
    ethnic TEXT,
    hometown TEXT,
    joinDate TEXT,
    unitId TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    academicYear TEXT,
    achievementLevel TEXT,
    status TEXT NOT NULL,
    statusHistory TEXT, -- JSON string
    isOutstanding INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    password TEXT,
    role TEXT NOT NULL,
    fullName TEXT,
    avatarUrl TEXT,
    phone TEXT,
    unitId TEXT,
    presets TEXT -- JSON string
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );

  -- Add default admin user if it doesn't exist
  INSERT OR IGNORE INTO users (uid, email, password, role, fullName, avatarUrl, phone)
  VALUES ('admin-id', 'admin@gmail.com', 'admin', 'admin', 'Admin System', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', '0900000000');
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Auth Login
  app.post("/api/login", (req, res) => {
    try {
      const { email, password } = req.body;
      const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
      
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
  app.get("/api/units", (req, res) => {
    try {
      const units = db.prepare("SELECT * FROM units").all();
      res.json(units);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/units", (req, res) => {
    try {
      const { id, name, code, address, phone, email, createdAt } = req.body;
      db.prepare("INSERT INTO units (id, name, code, address, phone, email, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(id, name, code, address, phone, email, createdAt);
      
      io.emit("units:changed");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/units/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, address, phone, email } = req.body;
      db.prepare("UPDATE units SET name = ?, code = ?, address = ?, phone = ?, email = ? WHERE id = ?")
        .run(name, code, address, phone, email, id);
      
      io.emit("units:changed");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.delete("/api/units/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM units WHERE id = ?").run(req.params.id);
      io.emit("units:changed");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Members
  app.get("/api/members", (req, res) => {
    try {
      const members = db.prepare("SELECT * FROM members").all() as any[];
      const formattedMembers = members.map((m: any) => ({
        ...m,
        statusHistory: m.statusHistory ? JSON.parse(m.statusHistory) : [],
        isOutstanding: !!m.isOutstanding
      }));
      res.json(formattedMembers);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/members", (req, res) => {
    try {
      const m = req.body;
      db.prepare(`
        INSERT INTO members (id, fullName, memberId, dob, gender, ethnic, hometown, joinDate, unitId, email, phone, academicYear, achievementLevel, status, statusHistory, isOutstanding, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        m.id, m.fullName, m.memberId, m.dob, m.gender, m.ethnic, m.hometown, 
        m.joinDate, m.unitId, m.email, m.phone, m.academicYear, 
        m.achievementLevel, m.status, JSON.stringify(m.statusHistory || []), 
        m.isOutstanding ? 1 : 0, m.createdAt
      );
      
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/members/:id", (req, res) => {
    try {
      const { id } = req.params;
      const m = req.body;
      db.prepare(`
        UPDATE members SET 
          fullName = ?, memberId = ?, dob = ?, gender = ?, 
          ethnic = ?, hometown = ?, joinDate = ?, unitId = ?, 
          email = ?, phone = ?, academicYear = ?, 
          achievementLevel = ?, status = ?, statusHistory = ?,
          isOutstanding = ?
        WHERE id = ?
      `).run(
        m.fullName, m.memberId, m.dob, m.gender, 
        m.ethnic, m.hometown, m.joinDate, m.unitId, 
        m.email, m.phone, m.academicYear, 
        m.achievementLevel, m.status, JSON.stringify(m.statusHistory || []), 
        m.isOutstanding ? 1 : 0, id
      );
      
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.delete("/api/members/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/members/:id/outstanding", (req, res) => {
    try {
      const { id } = req.params;
      const { isOutstanding } = req.body;
      db.prepare("UPDATE members SET isOutstanding = ? WHERE id = ?").run(isOutstanding ? 1 : 0, id);
      
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Users / Profiles
  app.get("/api/users/:uid", (req, res) => {
    try {
      const user = db.prepare("SELECT * FROM users WHERE uid = ?").get(req.params.uid) as any;
      if (user && user.presets) user.presets = JSON.parse(user.presets);
      res.json(user || null);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/users/by-email/:email", (req, res) => {
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(req.params.email) as any;
      if (user && user.presets) user.presets = JSON.parse(user.presets);
      res.json(user || null);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/users", (req, res) => {
    try {
      const { uid, email, password, role, fullName, avatarUrl, phone, unitId, presets } = req.body;
      const existing = db.prepare("SELECT uid FROM users WHERE uid = ?").get(uid);
      
      if (existing) {
        db.prepare(`
          UPDATE users SET 
            email = ?, password = ?, role = ?, fullName = ?, 
            avatarUrl = ?, phone = ?, unitId = ?, presets = ? 
          WHERE uid = ?
        `).run(email, password, role, fullName, avatarUrl, phone, unitId, JSON.stringify(presets || []), uid);
      } else {
        db.prepare(`
          INSERT INTO users (uid, email, password, role, fullName, avatarUrl, phone, unitId, presets) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uid, email, password, role, fullName, avatarUrl, phone, unitId, JSON.stringify(presets || []));
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/users/:uid/profile", (req, res) => {
    try {
      const { uid } = req.params;
      const { fullName, avatarUrl, email, phone } = req.body;
      db.prepare("UPDATE users SET fullName = ?, avatarUrl = ?, email = ?, phone = ? WHERE uid = ?")
        .run(fullName, avatarUrl, email, phone, uid);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/users/:uid/presets", (req, res) => {
    try {
      const { uid } = req.params;
      const { presets } = req.body;
      db.prepare("UPDATE users SET presets = ? WHERE uid = ?")
        .run(JSON.stringify(presets), uid);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // Activities
  app.get("/api/activities", (req, res) => {
    try {
      const activities = db.prepare("SELECT * FROM activities").all();
      res.json(activities);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/activities", (req, res) => {
    try {
      const { id, title, date, location, description, type, createdAt } = req.body;
      db.prepare("INSERT INTO activities (id, title, date, location, description, type, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(id, title, date, location, description, type, createdAt);
      
      io.emit("activities:changed");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/activities/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { title, date, location, description, type } = req.body;
      db.prepare("UPDATE activities SET title = ?, date = ?, location = ?, description = ?, type = ? WHERE id = ?")
        .run(title, date, location, description, type, id);
      
      io.emit("activities:changed");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.delete("/api/activities/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM activities WHERE id = ?").run(req.params.id);
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
