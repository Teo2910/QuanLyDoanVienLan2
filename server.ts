import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import sql from "mssql";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { GoogleGenerativeAI } from "@google/generative-ai";

console.log(">>> [SERVER] BOOTING - REVISION 4 (API Diagnostic Mode) <<<");

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

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  const globalErrors: string[] = [];

  async function logActivity(req: any, action: string, entityType: string, entityId: string, details: string) {
    if (!pool || !pool.connected) {
      console.log("logActivity skipped, no pool. pool:", !!pool, "connected:", pool ? pool.connected : false);
      return;
    }
    console.log("logActivity executing for", action);
    try {
      const headerName = req.header("x-user-name") || req.header("X-User-Name");
      const headerId = req.header("x-user-id") || req.header("X-User-Id");
      
      let userName = "Hệ thống";
      try { userName = headerName ? decodeURIComponent(headerName) : userName; } catch(e) { userName = String(headerName); }
      
      let userId = "system";
      try { userId = headerId ? decodeURIComponent(headerId) : userId; } catch(e) { userId = String(headerId); }

      const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      const timestamp = Date.now();
      const upRes = await pool.request()
        .input("id", sql.NVarChar, id)
        .input("userId", sql.NVarChar, userId)
        .input("userName", sql.NVarChar, userName)
        .input("action", sql.NVarChar, action)
        .input("entityType", sql.NVarChar, entityType)
        .input("entityId", sql.NVarChar, entityId)
        .input("details", sql.NVarChar, details)
        .input("timestamp", sql.BigInt, timestamp)
        .query(`
          IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='activity_logs')
          BEGIN
            CREATE TABLE activity_logs (
              id NVARCHAR(50) PRIMARY KEY,
              userId NVARCHAR(50),
              userName NVARCHAR(255),
              action NVARCHAR(255),
              entityType NVARCHAR(50),
              entityId NVARCHAR(50),
              details NVARCHAR(MAX),
              createdAt BIGINT
            )
          END
          ELSE
          BEGIN
            -- Try to add createdAt if it doesn't exist (in case of old table)
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='activity_logs' AND COLUMN_NAME='createdAt')
            BEGIN
              ALTER TABLE activity_logs ADD createdAt BIGINT;
            END
          END

          INSERT INTO activity_logs (id, userId, userName, action, entityType, entityId, details, createdAt)
          VALUES (@id, @userId, @userName, @action, @entityType, @entityId, @details, @timestamp)
        `);
    } catch (err: any) {
      console.error("Failed to log activity:", err.message);
      globalErrors.push(`Log Error: ${err.message}`);
    }
  }
  // --- API Routes START ---
  const apiRouter = express.Router();

  apiRouter.use((req, res, next) => {
    console.log(`[API Diagnostic] ${req.method} ${req.path} (Original: ${req.originalUrl})`);
    next();
  });

  apiRouter.get("/ping", (req, res) => res.json({ pong: true }));

  // Knowledge Base explicit route handlers
  apiRouter.route("/knowledge-base")
    .get(async (req, res) => {
      console.log("[Knowledge] GET hit at /api/knowledge-base");
      try {
        if (!pool || !pool.connected) throw new Error("Database not connected");
        const result = await pool.request().query("SELECT * FROM knowledge_base ORDER BY updatedAt DESC");
        res.json(result.recordset);
      } catch (err) {
        console.error("[Knowledge] GET error:", err);
        res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
      }
    })
    .post(async (req, res) => {
      console.log("[Knowledge] POST hit at /api/knowledge-base", req.body);
      try {
        if (!pool || !pool.connected) throw new Error("Database not connected");
        const { title, content, category } = req.body;
        const id = Date.now().toString(16) + Math.random().toString(16).substring(2, 5);
        const updatedAt = Date.now();
        
        await pool.request()
          .input("id", sql.NVarChar, id)
          .input("title", sql.NVarChar, title)
          .input("content", sql.NVarChar, content)
          .input("category", sql.NVarChar, category || null)
          .input("updatedAt", sql.BigInt, updatedAt)
          .query("INSERT INTO knowledge_base (id, title, content, category, updatedAt) VALUES (@id, @title, @content, @category, @updatedAt)");
        
        await logActivity(req, "Thêm tài liệu nghiệp vụ", "Knowledge", id, `Tiêu đề: ${title}`);
        res.json({ success: true, id });
      } catch (err) {
        console.error("[Knowledge] POST error:", err);
        res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
      }
    });

  apiRouter.route("/knowledge-base/:id")
    .put(async (req, res) => {
      console.log("[Knowledge] PUT hit:", req.params.id);
      try {
        if (!pool || !pool.connected) throw new Error("Database not connected");
        const { id } = req.params;
        const { title, content, category } = req.body;
        const updatedAt = Date.now();
        
        await pool.request()
          .input("id", sql.NVarChar, id)
          .input("title", sql.NVarChar, title)
          .input("content", sql.NVarChar, content)
          .input("category", sql.NVarChar, category || null)
          .input("updatedAt", sql.BigInt, updatedAt)
          .query("UPDATE knowledge_base SET title = @title, content = @content, category = @category, updatedAt = @updatedAt WHERE id = @id");
        
        await logActivity(req, "Cập nhật tài liệu nghiệp vụ", "Knowledge", id, `Tiêu đề: ${title}`);
        res.json({ success: true });
      } catch (err) {
        console.error("[Knowledge] PUT error:", err);
        res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
      }
    })
    .delete(async (req, res) => {
      console.log("[Knowledge] DELETE hit:", req.params.id);
      try {
        if (!pool || !pool.connected) throw new Error("Database not connected");
        const { id } = req.params;
        await pool.request().input("id", sql.NVarChar, id).query("DELETE FROM knowledge_base WHERE id = @id");
        await logActivity(req, "Xóa tài liệu nghiệp vụ", "Knowledge", id, `ID: ${id}`);
        res.json({ success: true });
      } catch (err) {
        console.error("[Knowledge] DELETE error:", err);
        res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
      }
    });

  // Attach Router
  app.use("/api", apiRouter);

  // Presence API
  apiRouter.get("/presence-system", async (req, res) => {
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

  // User Profile Routes
  apiRouter.post("/login", async (req, res) => {
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
          const upRes = await pool.request()
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

  // DB Connection & Migration
  const initDb = async () => {
    try {
      console.log(`[DB] Connecting to ${sqlConfig.server}...`);
      pool = await sql.connect(sqlConfig);
      console.log("[DB] Connected successfully.");
      
      // Auto-migrate tables if needed
      try {
        await pool.request().query(`
          IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='units')
          BEGIN
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='units' AND COLUMN_NAME='parentId')
            BEGIN
              ALTER TABLE units ADD parentId NVARCHAR(50);
            END
          END

          IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='members')
          BEGIN
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='members' AND COLUMN_NAME='statusHistory')
            BEGIN
              ALTER TABLE members ADD statusHistory NVARCHAR(MAX);
            END
            
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='members' AND COLUMN_NAME='createdAt')
            BEGIN
              ALTER TABLE members ADD createdAt BIGINT;
            END
          END
        `);
      } catch(e) { console.error("[DB] Migration error:", e); }
      
      // Create tables if not exists
      const tableQueries = [
        `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='activity_logs')
        BEGIN
          CREATE TABLE activity_logs (
            id NVARCHAR(50) PRIMARY KEY,
            userId NVARCHAR(50),
            userName NVARCHAR(255),
            action NVARCHAR(255),
            entityType NVARCHAR(50),
            entityId NVARCHAR(50),
            details NVARCHAR(MAX),
            createdAt BIGINT
          )
        END`,
        `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='activities')
        BEGIN
          CREATE TABLE activities (
            id NVARCHAR(50) PRIMARY KEY,
            title NVARCHAR(255),
            date NVARCHAR(100),
            location NVARCHAR(255),
            description NVARCHAR(MAX),
            type NVARCHAR(100),
            createdAt BIGINT
          )
        END`,
        `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='chat_messages')
        BEGIN
          CREATE TABLE chat_messages (
            id NVARCHAR(50) PRIMARY KEY,
            threadId NVARCHAR(50),
            senderId NVARCHAR(50),
            senderName NVARCHAR(255),
            senderRole NVARCHAR(50),
            content NVARCHAR(MAX),
            isRead BIT,
            createdAt BIGINT
          )
        END`,
        `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='knowledge_base')
        BEGIN
          CREATE TABLE knowledge_base (
            id NVARCHAR(50) PRIMARY KEY,
            title NVARCHAR(255) NOT NULL,
            content NVARCHAR(MAX) NOT NULL,
            category NVARCHAR(100),
            updatedAt BIGINT
          )
        END`,
        `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='movements')
        BEGIN
          CREATE TABLE movements (
            id NVARCHAR(50) PRIMARY KEY,
            title NVARCHAR(255),
            startDate NVARCHAR(100),
            endDate NVARCHAR(100),
            description NVARCHAR(MAX),
            attachments NVARCHAR(MAX),
            participatingUnitIds NVARCHAR(MAX),
            creatorId NVARCHAR(50),
            createdAt BIGINT
          )
        END`,
        `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='movement_reports')
        BEGIN
          CREATE TABLE movement_reports (
            id NVARCHAR(50) PRIMARY KEY,
            movementId NVARCHAR(50),
            unitId NVARCHAR(50),
            description NVARCHAR(MAX),
            attachments NVARCHAR(MAX),
            submittedAt BIGINT
          )
        END`
      ];

      for (const q of tableQueries) {
        try {
          await pool.request().query(q);
        } catch (e) {
          console.error("[DB] Table query failed:", q.substring(0, 50), "Error:", e);
        }
      }
      console.log("[DB] Tables verified.");
      
      // Sync users into memory
      try {
        const result = await pool.request().query("SELECT uid, email, role, fullName, avatarUrl, unitId FROM users");
        result.recordset.forEach(u => {
          const uid = u.uid || `db-${u.email}`;
          systemUsers.set(uid, {
            uid, email: u.email, role: u.role, fullName: u.fullName, avatarUrl: u.avatarUrl, unitId: u.unitId
          });
        });
      } catch (e) { console.error("[DB] Initial user sync failed:", e); }
    } catch (err) {
      console.error("[DB] Connection Failed:", err);
    }
  };
  initDb();

  io.on("connection", (socket) => {
    socket.on("presence:online", (uid: string) => {
      for (const [sid, data] of onlineUsers.entries()) {
        if (data.uid === uid) onlineUsers.delete(sid);
      }
      onlineUsers.set(socket.id, { uid, lastSeen: Date.now() });
      io.emit("presence:update", Array.from(onlineUsers.values()));
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.id);
      io.emit("presence:update", Array.from(onlineUsers.values()));
    });
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
      const upRes = await pool.request()
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
      const upRes = await pool.request()
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
      const upRes = await pool.request()
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
      const { id, name, code, address, phone, email, createdAt, parentId } = req.body;
      const upRes = await pool.request()
        .input("id", sql.NVarChar, id)
        .input("name", sql.NVarChar, name)
        .input("code", sql.NVarChar, code || null)
        .input("address", sql.NVarChar, address || null)
        .input("phone", sql.NVarChar, phone || null)
        .input("email", sql.NVarChar, email || null)
        .input("parentId", sql.NVarChar, parentId || null)
        .input("createdAt", sql.BigInt, createdAt)
        .query("INSERT INTO units (id, name, code, address, phone, email, parentId, createdAt) VALUES (@id, @name, @code, @address, @phone, @email, @parentId, @createdAt)");
      
      await logActivity(req, "Thêm đơn vị mới", "Unit", id, `Đơn vị: ${name}`);
      io.emit("units:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  // Movements
  app.get("/api/movements", async (req, res) => {
    try {
      if (!pool || !pool.connected) return res.json([]);
      const result = await pool.request().query("SELECT * FROM movements ORDER BY createdAt DESC");
      const formatted = result.recordset.map(m => ({
        ...m,
        attachments: m.attachments ? JSON.parse(m.attachments) : [],
        participatingUnitIds: m.participatingUnitIds ? JSON.parse(m.participatingUnitIds) : []
      }));
      res.json(formatted);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/movements", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const m = req.body;
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("title", sql.NVarChar, m.title)
        .input("startDate", sql.NVarChar, m.startDate)
        .input("endDate", sql.NVarChar, m.endDate)
        .input("description", sql.NVarChar, m.description || null)
        .input("attachments", sql.NVarChar, JSON.stringify(m.attachments || []))
        .input("participatingUnitIds", sql.NVarChar, JSON.stringify(m.participatingUnitIds || []))
        .input("creatorId", sql.NVarChar, m.creatorId)
        .input("createdAt", sql.BigInt, Date.now())
        .query(`
          INSERT INTO movements (id, title, startDate, endDate, description, attachments, participatingUnitIds, creatorId, createdAt)
          VALUES (@id, @title, @startDate, @endDate, @description, @attachments, @participatingUnitIds, @creatorId, @createdAt)
        `);
      
      await logActivity(req, "Tạo phong trào mới", "Movement", id, `Phong trào: ${m.title}`);
      io.emit("movements:changed");
      res.json({ success: true, id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  // Movement Reports
  app.get("/api/movement-reports", async (req, res) => {
    try {
      if (!pool || !pool.connected) return res.json([]);
      const { movementId } = req.query;
      let query = "SELECT * FROM movement_reports";
      const request = pool.request();
      
      if (movementId) {
        query += " WHERE movementId = @movementId";
        request.input("movementId", sql.NVarChar, movementId);
      }
      
      const result = await request.query(query);
      const formatted = result.recordset.map(r => ({
        ...r,
        attachments: r.attachments ? JSON.parse(r.attachments) : []
      }));
      res.json(formatted);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/movement-reports", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const r = req.body;
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("movementId", sql.NVarChar, r.movementId)
        .input("unitId", sql.NVarChar, r.unitId)
        .input("description", sql.NVarChar, r.description)
        .input("attachments", sql.NVarChar, JSON.stringify(r.attachments || []))
        .input("submittedAt", sql.BigInt, Date.now())
        .query(`
          INSERT INTO movement_reports (id, movementId, unitId, description, attachments, submittedAt)
          VALUES (@id, @movementId, @unitId, @description, @attachments, @submittedAt)
        `);
      
      await logActivity(req, "Nộp báo cáo phong trào", "MovementReport", id, `ID phong trào: ${r.movementId}`);
      io.emit("movement-reports:changed", { movementId: r.movementId });
      res.json({ success: true, id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.put("/api/units/:id", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const { id } = req.params;
      const { name, code, address, phone, email, parentId } = req.body;
      await pool.request()
        .input("id", sql.NVarChar, id)
        .input("name", sql.NVarChar, name)
        .input("code", sql.NVarChar, code || null)
        .input("address", sql.NVarChar, address || null)
        .input("phone", sql.NVarChar, phone || null)
        .input("email", sql.NVarChar, email || null)
        .input("parentId", sql.NVarChar, parentId || null)
        .query("UPDATE units SET name = @name, code = @code, address = @address, phone = @phone, email = @email, parentId = @parentId WHERE id = @id");
      
      await logActivity(req, "Cập nhật đơn vị", "Unit", id, `Đơn vị: ${name}`);
      io.emit("units:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const { id } = req.params;
      
      const checkRes = await pool.request()
        .input("id", sql.NVarChar, id)
        .query("SELECT COUNT(*) as count FROM members WHERE unitId = @id");
      
      if (checkRes.recordset[0].count > 0) {
        return res.status(400).json({ error: "Không thể xóa đơn vị đang có đoàn viên sinh hoạt. Vui lòng chuyển đoàn viên sang đơn vị khác trước." });
      }

      await pool.request().input("id", sql.NVarChar, id).query("DELETE FROM units WHERE id = @id");
      await logActivity(req, "Xóa đơn vị", "Unit", id, `ID Đơn vị: ${id}`);
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
        id: m.id || m.ID || m.Id || m._id || m.MemberId || m.memberId,
        status: m.status ? m.status.trim() : "Đang sinh hoạt",
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
      const upRes = await pool.request()
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
      
      await logActivity(req, "Thêm đoàn viên", "Member", m.id, `Đoàn viên: ${m.fullName}`);
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
      const upRes = await pool.request()
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
        
      await logActivity(req, "Cập nhật đoàn viên", "Member", req.params.id, `Đoàn viên: ${m.fullName}`);
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
      
      // Fetch the member name before deleting so we can log it
      const memberQuery = await pool.request().input("id", sql.NVarChar, req.params.id).query("SELECT fullName FROM members WHERE id = @id");
      const memberName = memberQuery.recordset.length > 0 ? memberQuery.recordset[0].fullName : req.params.id;

      const upRes = await pool.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM members WHERE id = @id");
      await logActivity(req, "Xóa đoàn viên", "Member", req.params.id, `Đoàn viên: ${memberName}`);
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
      await logActivity(req, "Xóa nhiều đoàn viên", "Member", "bulk", `Đã xóa ${result.rowsAffected[0]} đoàn viên`);
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
      const upRes = await pool.request()
        .input("id", sql.NVarChar, id)
        .input("isOutstanding", sql.Bit, isOutstanding)
        .query("UPDATE members SET isOutstanding = @isOutstanding WHERE id = @id");
      await logActivity(req, "Cập nhật đoàn viên tiêu biểu", "Member", id, `Trạng thái: ${isOutstanding ? "Tiêu biểu" : "Bình thường"}`);
      io.emit("members:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.get("/api/debug-errors", (req, res) => {
    res.json({
      globalErrors,
      pool: !!pool,
      connected: pool ? pool.connected : null,
      sqlConfig: {
        server: sqlConfig.server,
        port: sqlConfig.port,
        database: sqlConfig.database
      }
    });
  });

  // Activities
  app.get("/api/activities", async (req, res) => {
    try {
      if (!pool || !pool.connected) return res.json([]);
      // Check if table exists
      const tbl = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='activities'");
      if (tbl.recordset.length === 0) return res.json([]);
      
      const result = await pool.request().query("SELECT * FROM activities ORDER BY date DESC");
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  const chatMessagesInMemory: any[] = [];

  const ensureChatTable = async () => {
    if (!pool || !pool.connected) return;
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='chat_messages')
        BEGIN
          CREATE TABLE chat_messages (
            id NVARCHAR(50) PRIMARY KEY,
            threadId NVARCHAR(50),
            senderId NVARCHAR(50),
            senderName NVARCHAR(255),
            senderRole NVARCHAR(50),
            content NVARCHAR(MAX),
            isRead BIT,
            createdAt BIGINT
          )
        END
      `);
    } catch(err) {
      console.error(err);
    }
  };

  app.get("/api/chat/threads", async (req, res) => {
    try {
      if (!pool || !pool.connected) {
        // In-memory fallback
        const threadsMap = new Map<string, any>();
        chatMessagesInMemory.forEach(m => {
          const t = threadsMap.get(m.threadId) || { threadId: m.threadId, lastMessageAt: 0, unreadCount: 0 };
          t.lastMessageAt = Math.max(t.lastMessageAt, m.createdAt);
          if (!m.isRead && m.senderRole !== 'Admin') t.unreadCount++;
          threadsMap.set(m.threadId, t);
        });
        const threadsArray = Array.from(threadsMap.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
        return res.json(threadsArray);
      }
      const result = await pool.request().query(`
        SELECT threadId, MAX(createdAt) as lastMessageAt, SUM(CAST(CASE WHEN isRead = 0 AND senderRole != 'Admin' THEN 1 ELSE 0 END AS INT)) as unreadCount
        FROM chat_messages
        GROUP BY threadId
        ORDER BY lastMessageAt DESC
      `);
      res.json(result.recordset);
    } catch (err: any) {
      await ensureChatTable();
      try {
        const result = await pool.request().query(`
          SELECT threadId, MAX(createdAt) as lastMessageAt, SUM(CAST(CASE WHEN isRead = 0 AND senderRole != 'Admin' THEN 1 ELSE 0 END AS INT)) as unreadCount
          FROM chat_messages
          GROUP BY threadId
          ORDER BY lastMessageAt DESC
        `);
        res.json(result.recordset);
      } catch (innerErr: any) {
        res.status(500).json({ error: innerErr.message });
      }
    }
  });

  app.get("/api/chat/messages/:threadId", async (req, res) => {
    try {
      if (!pool || !pool.connected) {
        const msgs = chatMessagesInMemory.filter(m => m.threadId === req.params.threadId).sort((a,b) => a.createdAt - b.createdAt);
        return res.json(msgs);
      }
      try {
        const result = await pool.request()
          .input("threadId", sql.NVarChar, req.params.threadId)
          .query("SELECT * FROM chat_messages WHERE threadId = @threadId ORDER BY createdAt ASC");
        res.json(result.recordset);
      } catch(err: any) {
        await ensureChatTable();
        const result = await pool.request()
          .input("threadId", sql.NVarChar, req.params.threadId)
          .query("SELECT * FROM chat_messages WHERE threadId = @threadId ORDER BY createdAt ASC");
        res.json(result.recordset);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    try {
      const m = req.body;
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      const createdAt = Date.now();
      const newMsg = { id, threadId: m.threadId, senderId: m.senderId, senderName: m.senderName, senderRole: m.senderRole, content: m.content, isRead: false, createdAt };

      if (!pool || !pool.connected) {
        chatMessagesInMemory.push(newMsg);
        io.emit("chat:new", newMsg);
        return res.json(newMsg);
      }
      
      try {
        await pool.request()
          .input("id", sql.NVarChar, id)
          .input("threadId", sql.NVarChar, m.threadId)
          .input("senderId", sql.NVarChar, m.senderId)
          .input("senderName", sql.NVarChar, m.senderName)
          .input("senderRole", sql.NVarChar, m.senderRole)
          .input("content", sql.NVarChar, m.content)
          .input("isRead", sql.Bit, 0)
          .input("createdAt", sql.BigInt, createdAt)
          .query(`
            INSERT INTO chat_messages (id, threadId, senderId, senderName, senderRole, content, isRead, createdAt)
            VALUES (@id, @threadId, @senderId, @senderName, @senderRole, @content, @isRead, @createdAt)
          `);
      } catch (err: any) {
        // Table might be missing, try recreating and inserting again
        await ensureChatTable();
        await pool.request()
          .input("id", sql.NVarChar, id)
          .input("threadId", sql.NVarChar, m.threadId)
          .input("senderId", sql.NVarChar, m.senderId)
          .input("senderName", sql.NVarChar, m.senderName)
          .input("senderRole", sql.NVarChar, m.senderRole)
          .input("content", sql.NVarChar, m.content)
          .input("isRead", sql.Bit, 0)
          .input("createdAt", sql.BigInt, createdAt)
          .query(`
            INSERT INTO chat_messages (id, threadId, senderId, senderName, senderRole, content, isRead, createdAt)
            VALUES (@id, @threadId, @senderId, @senderName, @senderRole, @content, @isRead, @createdAt)
          `);
      }
      
      io.emit("chat:new", newMsg);
      res.json(newMsg);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chat/read/:threadId", async (req, res) => {
    try {
      const { role } = req.body;
      let condition = "senderRole != 'Admin'";
      if (role === "User") condition = "senderRole = 'Admin'";

      if (!pool || !pool.connected) {
        chatMessagesInMemory.forEach(m => {
          if (m.threadId === req.params.threadId) {
            if (role === "User" && m.senderRole === "Admin") m.isRead = true;
            if (role === "Admin" && m.senderRole !== "Admin") m.isRead = true;
          }
        });
        io.emit("chat:read", { threadId: req.params.threadId, role });
        return res.json({ success: true });
      }

      try {
        await pool.request()
          .input("threadId", sql.NVarChar, req.params.threadId)
          .query(`UPDATE chat_messages SET isRead = 1 WHERE threadId = @threadId AND ${condition}`);
      } catch (err) {
        await ensureChatTable();
      }
        
      io.emit("chat:read", { threadId: req.params.threadId, role });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const a = req.body;
      const upRes = await pool.request()
        .input("id", sql.NVarChar, a.id)
        .input("title", sql.NVarChar, a.title)
        .input("date", sql.NVarChar, a.date)
        .input("location", sql.NVarChar, a.location || null)
        .input("description", sql.NVarChar, a.description || null)
        .input("type", sql.NVarChar, a.type)
        .input("createdAt", sql.BigInt, a.createdAt || Date.now())
        .query(`
          INSERT INTO activities (id, title, date, location, description, type, createdAt)
          VALUES (@id, @title, @date, @location, @description, @type, @createdAt)
        `);
      
      await logActivity(req, "Thêm hoạt động", "Activity", a.id, `Hoạt động: ${a.title}`);
      io.emit("activities:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.put("/api/activities/:id", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      const a = req.body;
      const upRes = await pool.request()
        .input("id", sql.NVarChar, req.params.id)
        .input("title", sql.NVarChar, a.title)
        .input("date", sql.NVarChar, a.date)
        .input("location", sql.NVarChar, a.location || null)
        .input("description", sql.NVarChar, a.description || null)
        .input("type", sql.NVarChar, a.type)
        .query(`
          UPDATE activities SET 
            title = @title, date = @date, location = @location, 
            description = @description, type = @type
          WHERE id = @id
        `);
      
      await logActivity(req, "Cập nhật hoạt động", "Activity", req.params.id, `Hoạt động: ${a.title}`);
      io.emit("activities:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  app.delete("/api/activities/:id", async (req, res) => {
    try {
      if (!pool || !pool.connected) throw new Error("Database not connected");
      
      const q = await pool.request().input("id", sql.NVarChar, req.params.id).query("SELECT title FROM activities WHERE id = @id");
      const aName = q.recordset.length > 0 ? q.recordset[0].title : req.params.id;

      const upRes = await pool.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM activities WHERE id = @id");
      await logActivity(req, "Xóa hoạt động", "Activity", req.params.id, `Hoạt động: ${aName}`);
      io.emit("activities:changed");
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Database error" });
    }
  });

  // Activity Logs
  app.get("/api/test-logs", async (req, res) => {
    try {
      if (!pool || !pool.connected) {
        console.log("No pool, attempting reconnect...");
        pool = await sql.connect(sqlConfig);
        console.log("Reconnected!");
      }
      const tbl = await pool.request().query("SELECT * FROM sys.tables WHERE name='activity_logs'");
      let created = false;
      let errInsert = null;
      if (tbl.recordset.length === 0) {
        const upRes = await pool.request().query(`
          CREATE TABLE activity_logs (
            id NVARCHAR(50) PRIMARY KEY,
            userId NVARCHAR(50),
            userName NVARCHAR(255),
            action NVARCHAR(255),
            entityType NVARCHAR(50),
            entityId NVARCHAR(50),
            details NVARCHAR(MAX),
            [timestamp] BIGINT
          )
        `);
        created = true;
      }
      try {
        const upRes = await pool.request()
          .input("id", sql.NVarChar, "check-" + Date.now())
          .input("userId", sql.NVarChar, "system")
          .input("userName", sql.NVarChar, "sys")
          .input("action", sql.NVarChar, "test")
          .input("entityType", sql.NVarChar, "Log")
          .input("entityId", sql.NVarChar, "0")
          .input("details", sql.NVarChar, "test log")
          .input("timestamp", sql.BigInt, Date.now())
          .query(`
            INSERT INTO activity_logs (id, userId, userName, action, entityType, entityId, details, [timestamp])
            VALUES (@id, @userId, @userName, @action, @entityType, @entityId, @details, @timestamp)
          `);
      } catch (err: any) {
        errInsert = err.message || JSON.stringify(err);
      }
      
      const select = await pool.request().query("SELECT * FROM activity_logs");
      res.json({ tableExists: tbl.recordset.length > 0, created, insertedData: select.recordset, error: errInsert });
    } catch (err: any) {
      res.json({ error: err.message || JSON.stringify(err) });
    }
  });

  app.get("/api/logs", async (req, res) => {
    try {
      if (!pool || !pool.connected) return res.json([]);
      const tbl = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='activity_logs'");
      if (tbl.recordset.length === 0) return res.json([]);

      const result = await pool.request().query(`
        SELECT TOP 100 * FROM activity_logs 
        ORDER BY 
          CASE WHEN createdAt IS NOT NULL THEN createdAt ELSE 0 END DESC
      `);
      const mapped = result.recordset.map((row: any) => {
        row.timestamp = row.createdAt || row.timestamp || 0;
        return row;
      });
      mapped.sort((a: any, b: any) => b.timestamp - a.timestamp);
      
      res.json(mapped);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/test-db", async (req, res) => {
    try {
      if (!pool || !pool.connected) return res.json({ error: "no pool" });
      const result = await pool.request().query("SELECT TOP 5 id, status, len(id) as idLen FROM members WHERE LTRIM(RTRIM(status)) = N'Đang sinh hoạt'");
      res.json(result.recordset);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/trigger-cron", async (req, res) => {
    try {
      if (!pool || !pool.connected) return res.json({ error: "No DB connection" });
      const result = await pool.request().query("SELECT * FROM members WHERE LTRIM(RTRIM(status)) = N'Đang sinh hoạt'");
      const members = result.recordset || [];
      
      let updatedCount = 0;
      let logs = [];
      for (const m of members) {
        if (!m.dob) continue;
        let dobDate: Date;
        let dobStr = m.dob.trim();
        const parts = dobStr.split(/[\/\-]/);
        if (parts.length === 3 && parts[2].length === 4) {
          dobDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else if (parts.length === 3 && parts[0].length === 4) {
          dobDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        } else {
          dobDate = new Date(dobStr);
        }

        if (isNaN(dobDate.getTime())) continue;
        
        let age = new Date().getFullYear() - dobDate.getFullYear();
        const mth = new Date().getMonth() - dobDate.getMonth();
        if (mth < 0 || (mth === 0 && new Date().getDate() < dobDate.getDate())) {
            age--;
        }

        if (age >= 30) {
          let history: any[] = [];
          if (m.statusHistory) {
            try {
              history = JSON.parse(m.statusHistory);
              if (!Array.isArray(history)) history = [];
            } catch (e) {
              history = [];
            }
          }
          
          history.push({
            status: "Đã trưởng thành",
            date: new Date().toISOString(),
            note: "Hệ thống tự động chuyển do đủ 30 tuổi"
          });
          
          try {
            const upRes = await pool.request()
              .input("updateId", sql.NVarChar, m.id || m.ID || m.Id || m._id)
              .input("updateStatus", sql.NVarChar, "Đã trưởng thành")
              .input("updateHistory", sql.NVarChar, JSON.stringify(history))
              .query(`
                UPDATE members 
                SET status = @updateStatus, statusHistory = @updateHistory
                WHERE LTRIM(RTRIM(id)) = LTRIM(RTRIM(@updateId))
              `);
            
            // Check rowsAffected
            if (!upRes || !upRes.rowsAffected || upRes.rowsAffected[0] === 0) {
              console.log('[Warning] Zero rows affected for update ID: ' + (m.id || m.ID || m.Id));
              continue;
            }

            const idLog = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
            await pool.request()
              .input("logId", sql.NVarChar, idLog)
              .input("userId", sql.NVarChar, "system")
              .input("logUserName", sql.NVarChar, "Hệ thống")
              .input("logAction", sql.NVarChar, "Tự động cập nhật đoàn viên")
              .input("logEntityType", sql.NVarChar, "Member")
              .input("logEntityId", sql.NVarChar, m.id || m.ID || m.Id || m._id)
              .input("logDetails", sql.NVarChar, `Đoàn viên: ${m.fullName} - Đã trưởng thành do đủ 30 tuổi`)
              .input("logCreatedAt", sql.BigInt, Date.now())
              .query(`
                INSERT INTO activity_logs (id, userId, userName, action, entityType, entityId, details, createdAt)
                VALUES (@logId, @userId, @logUserName, @logAction, @logEntityType, @logEntityId, @logDetails, @logCreatedAt)
              `);

            updatedCount++;
            logs.push(`Updated ${m.fullName} (Age: ${age})`);
          } catch(e: any) {
             logs.push(`Error ${m.fullName}: ${e.message}`);
          }
        }
      }
      
      if (updatedCount > 0) {
        io.emit("members:changed");
        io.emit("logs:changed");
      }
      res.json({ success: true, updatedCount, logs, processed: members.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Start Background Job for Member Age Validation
  setInterval(async () => {
    if (!pool || !pool.connected) return;
    try {
      const result = await pool.request().query("SELECT * FROM members WHERE LTRIM(RTRIM(status)) = N'Đang sinh hoạt'");
      const members = result.recordset || [];
      
      let updatedCount = 0;
      for (const m of members) {
        if (!m.dob) continue;
        let dobDate: Date;
        let dobStr = m.dob.trim();
        // Check for DD/MM/YYYY or DD-MM-YYYY
        const parts = dobStr.split(/[\/\-]/);
        if (parts.length === 3 && parts[2].length === 4) {
          // DD/ MM/ YYYY
          dobDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else if (parts.length === 3 && parts[0].length === 4) {
          // YYYY-MM-DD
          dobDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        } else {
          dobDate = new Date(dobStr);
        }

        if (isNaN(dobDate.getTime())) continue;
        
        let age = new Date().getFullYear() - dobDate.getFullYear();
        const mth = new Date().getMonth() - dobDate.getMonth();
        if (mth < 0 || (mth === 0 && new Date().getDate() < dobDate.getDate())) {
            age--;
        }

        if (age >= 30) {
          let history: any[] = [];
          if (m.statusHistory) {
            try {
              history = JSON.parse(m.statusHistory);
              if (!Array.isArray(history)) history = [];
            } catch (e) {
              history = [];
            }
          }
          
          history.push({
            status: "Đã trưởng thành",
            date: new Date().toISOString(),
            note: "Hệ thống tự động chuyển do đủ 30 tuổi"
          });
          
          try {
            const upRes = await pool.request()
              .input("updateId", sql.NVarChar, m.id || m.ID || m.Id || m._id)
              .input("updateStatus", sql.NVarChar, "Đã trưởng thành")
              .input("updateHistory", sql.NVarChar, JSON.stringify(history))
              .query(`
                UPDATE members 
                SET status = @updateStatus, statusHistory = @updateHistory
                WHERE LTRIM(RTRIM(id)) = LTRIM(RTRIM(@updateId))
              `);
            
            // Check rowsAffected
            if (!upRes || !upRes.rowsAffected || upRes.rowsAffected[0] === 0) {
              console.log('[Warning] Zero rows affected for update ID: ' + (m.id || m.ID || m.Id));
              continue;
            }

            const idLog = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
            await pool.request()
              .input("logId", sql.NVarChar, idLog)
              .input("userId", sql.NVarChar, "system")
              .input("logUserName", sql.NVarChar, "Hệ thống")
              .input("logAction", sql.NVarChar, "Tự động cập nhật đoàn viên")
              .input("logEntityType", sql.NVarChar, "Member")
              .input("logEntityId", sql.NVarChar, m.id || m.ID || m.Id || m._id)
              .input("logDetails", sql.NVarChar, `Đoàn viên: ${m.fullName} - Đã trưởng thành do đủ 30 tuổi`)
              .input("logCreatedAt", sql.BigInt, Date.now())
              .query(`
                INSERT INTO activity_logs (id, userId, userName, action, entityType, entityId, details, createdAt)
                VALUES (@logId, @userId, @logUserName, @logAction, @logEntityType, @logEntityId, @logDetails, @logCreatedAt)
              `);

            updatedCount++;
            console.log(`[Auto-Update] Tự động chuyển '${m.fullName}' (${dobStr} -> Age: ${age}) sang Đã trưởng thành`);
          } catch(e: any) {
             console.error(`[Auto-Update] Error updating member ${m.id}: ${e.message}`);
             globalErrors.push(`[Auto-Update] ${e.message}`);
          }
        }
      }
      
      if (updatedCount > 0) {
        console.log(`Background Task: Updated ${updatedCount} members to Đã trưởng thành`);
        globalErrors.push(`[Auto-Update Success] Updated ${updatedCount} members.`);
        io.emit("members:changed");
        io.emit("logs:changed");
      }
    } catch (e: any) {
      console.error("Background task error:", e);
      globalErrors.push(`[Auto-Update Loop] ${e.message}`);
    }
  }, 10 * 1000); // 10 seconds check
  
  // 404 catch-all for API to prevent falling into SPA
  app.use("/api", (req, res) => {
    const diag = {
      method: req.method,
      url: req.url,
      path: req.path,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      params: req.params,
      query: req.query
    };
    console.warn(`[API 404] Route not found! Diagnostics:`, diag);
    res.status(404).json({ 
      error: `API route ${req.method} ${req.originalUrl} not found`,
      diagnostics: diag
    });
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
