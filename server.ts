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

  // State
  const onlineUsers = new Map<string, { uid: string; lastSeen: number }>();
  const systemUsers = new Map<string, any>();
  let pool: sql.ConnectionPool | null = null;

  app.use(express.json());

  // Log all API requests for debugging
  app.use("/api", (req, res, next) => {
    console.log(`[Presence] API Request: ${req.method} ${req.url}`);
    next();
  });

  // Presence API - defined at the very top of API routes
  app.get("/api/presence-system", async (req, res) => {
    try {
      let sqlUsers: any[] = [];
      if (pool && pool.connected) {
        const result = await pool.request().query("SELECT uid, email, role, fullName, avatarUrl, unitId FROM users");
        sqlUsers = result.recordset;
      }
      
      const allUsersMap = new Map();
      sqlUsers.forEach(u => {
        const uid = u.uid || `db-${u.email}`;
        allUsersMap.set(uid, {
          uid,
          email: u.email,
          role: u.role,
          fullName: u.fullName,
          avatarUrl: u.avatarUrl,
          unitId: u.unitId
        });
      });

      systemUsers.forEach((u, uid) => {
        allUsersMap.set(uid, { ...(allUsersMap.get(uid) || {}), ...u });
      });

      res.json(Array.from(allUsersMap.values()));
    } catch (err) {
      console.error("[Presence] Handler error:", err);
      res.json(Array.from(systemUsers.values()));
    }
  });

  // Log all requests for debugging
  app.use((req, res, next) => {
    if (req.url.includes('presence')) {
      console.log(`[Presence] DEBUG: method=${req.method} url=${req.url}`);
    }
    next();
  });

  // Very simple test endpoint to confirm routing is working
  app.get("/api/presence-test", (req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Initialize MSSQL
  try {
    console.log(`Attempting to connect to SQL Server at ${sqlConfig.server}:${sqlConfig.port}...`);
    pool = await sql.connect(sqlConfig);
    console.log("Connected to SQL Server successfully.");
    
    // Sync users into memory on startup
    try {
      const result = await pool.request().query("SELECT uid, email, role, fullName, avatarUrl, unitId FROM users");
      result.recordset.forEach(u => {
        const uid = u.uid || `db-${u.email}`;
        systemUsers.set(uid, {
          uid,
          email: u.email,
          role: u.role,
          fullName: u.fullName,
          avatarUrl: u.avatarUrl,
          unitId: u.unitId
        });
      });
      console.log(`[Presence] Initialized ${result.recordset.length} users from DB`);
    } catch (e) {
      console.error("[Presence] Failed to sync users from DB at startup:", e);
    }
  } catch (err) {
    console.error("SQL Server Connection Failed: ", err);
    // In preview environment, this will likely fail because localhost:1433 doesn't exist
  }

  io.on("connection", (socket) => {
    socket.on("presence:online", (uid: string) => {
      // Remove any existing entry for this UID from other sockets to avoid duplicates
      for (const [sid, data] of onlineUsers.entries()) {
        if (data.uid === uid) onlineUsers.delete(sid);
      }
      onlineUsers.set(socket.id, { uid, lastSeen: Date.now() });
      io.emit("presence:update", Array.from(onlineUsers.values()));
    });

    socket.on("disconnect", () => {
      const data = onlineUsers.get(socket.id);
      if (data) {
        onlineUsers.delete(socket.id);
      }
      io.emit("presence:update", Array.from(onlineUsers.values()));
    });
  });

  // Auth Login
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!pool || !pool.connected) {
        // Very basic fallback if DB is not ready during login
        return res.status(503).json({ error: "Database connecting... please try again in a few seconds." });
      }
      
      const result = await pool.request()
        .input("email", sql.NVarChar, email)
        .input("password", sql.NVarChar, password)
        .query("SELECT * FROM users WHERE email = @email AND password = @password");
      
      let user = result.recordset[0];
      if (user) {
        // Auto-fix if UID is missing
        if (!user.uid) {
          const newUid = Math.random().toString(36).substring(2, 11);
          await pool.request()
            .input("uid", sql.NVarChar, newUid)
            .input("email", sql.NVarChar, email)
            .query("UPDATE users SET uid = @uid WHERE email = @email");
          user.uid = newUid;
          console.log(`Auto-assigned UID ${newUid} to user ${email}`);
        }

        if (user.presets) user.presets = typeof user.presets === 'string' ? JSON.parse(user.presets) : user.presets;
        const { password: _, ...userWithoutPassword } = user;
        
        // Register in system users for real-time visibility
        const systemUserInfo = {
          uid: user.uid,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          unitId: user.unitId
        };
        systemUsers.set(user.uid, systemUserInfo);

        res.json(userWithoutPassword);
      } else {
        res.status(401).json({ error: "Email hoặc mật khẩu không chính xác" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // User Profile Routes
  app.get("/api/users/:uid", async (req, res) => {
    try {
      if (!pool || !pool.connected) {
        return res.status(503).json({ error: "DB connecting" });
      }
      const result = await pool.request()
        .input("uid", sql.NVarChar, req.params.uid)
        .query("SELECT * FROM users WHERE uid = @uid");
      
      const user = result.recordset[0];
      if (user) {
        if (user.presets) user.presets = typeof user.presets === 'string' ? JSON.parse(user.presets) : user.presets;
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const { uid, email, password, role, unitId } = req.body;
      await pool.request()
        .input("uid", sql.NVarChar, uid)
        .input("email", sql.NVarChar, email)
        .input("password", sql.NVarChar, password)
        .input("role", sql.NVarChar, role)
        .input("unitId", sql.NVarChar, unitId || null)
        .input("presets", sql.NVarChar, "[]")
        .query("INSERT INTO users (uid, email, password, role, unitId, presets) VALUES (@uid, @email, @password, @role, @unitId, @presets)");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/users/:uid/profile", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const { fullName, avatarUrl, phone } = req.body;
      await pool.request()
        .input("uid", sql.NVarChar, req.params.uid)
        .input("fullName", sql.NVarChar, fullName || null)
        .input("avatarUrl", sql.NVarChar, avatarUrl || null)
        .input("phone", sql.NVarChar, phone || null)
        .query("UPDATE users SET fullName = @fullName, avatarUrl = @avatarUrl, phone = @phone WHERE uid = @uid");

      // Update in-memory storage for real-time visibility
      const existing = systemUsers.get(req.params.uid);
      if (existing) {
        systemUsers.set(req.params.uid, {
          ...existing,
          fullName: fullName || existing.fullName,
          avatarUrl: avatarUrl || existing.avatarUrl
        });
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.put("/api/users/:uid/presets", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const { presets } = req.body;
      await pool.request()
        .input("uid", sql.NVarChar, req.params.uid)
        .input("presets", sql.NVarChar, JSON.stringify(presets))
        .query("UPDATE users SET presets = @presets WHERE uid = @uid");
      res.json({ success: true });
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

  // 404 catch-all for API to prevent falling into SPA
  app.all("/api/*", (req, res) => {
    console.warn(`[Presence] API route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
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
