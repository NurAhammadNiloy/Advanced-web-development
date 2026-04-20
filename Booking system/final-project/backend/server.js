import express from "express";
import cors from "cors";
import pool from "./src/db/pool.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Import Routers
import resourcesRouter from "./src/routes/resources.routes.js";
import reservationsRouter from "./src/routes/reservations.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { runMigrations } from "./src/db/migrate.js";

// Needed in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "64kb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; connect-src 'self'"
  );
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

const rateBuckets = new Map();
function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    if (bucket.count > max) {
      return res.status(429).json({ ok: false, error: "Too many attempts. Please wait a minute and try again." });
    }
    next();
  };
}

app.get("/", (req, res) => res.json({ ok: true, message: "API is running" }));
app.get("/api", (req, res) => res.json({ ok: true, message: "API is running" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API is running" });
});

// Phase7 API Routers
app.use("/api/resources", resourcesRouter);
app.use("/api/reservations", requireAuth, reservationsRouter);
app.use("/api/auth", rateLimit({ windowMs: 60 * 1000, max: 20 }), authRoutes);

app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, first_name, last_name, email, role, dob, is_active FROM users WHERE id = $1 LIMIT 1",
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ ok: false, error: "Profile not found" });
    return res.json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error("Profile fetch failed:", error);
    return res.status(500).json({ ok: false, error: "Database query failed" });
  }
});

app.put("/api/profile", requireAuth, async (req, res) => {
  const firstName = String(req.body.firstName || "").trim();
  const lastName = String(req.body.lastName || "").trim();
  const dob = req.body.dob || null;

  if (firstName.length < 2 || lastName.length < 2) {
    return res.status(400).json({ ok: false, error: "First and last name must be at least 2 characters." });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, dob = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, first_name, last_name, email, role, dob, is_active`,
      [firstName, lastName, dob, req.user.id]
    );
    return res.json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error("Profile update failed:", error);
    return res.status(500).json({ ok: false, error: "Profile update failed" });
  }
});

app.post("/api/profile/change-password", requireAuth, rateLimit({ windowMs: 60 * 1000, max: 5 }), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: "Current password and a stronger new password are required." });
  }

  try {
    const bcrypt = await import("bcryptjs");
    const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1 LIMIT 1", [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ ok: false, error: "Profile not found" });

    const passwordOk = await bcrypt.default.compare(currentPassword, rows[0].password_hash);
    if (!passwordOk) return res.status(401).json({ ok: false, error: "Current password is incorrect." });

    const hash = await bcrypt.default.hash(newPassword, 12);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hash, req.user.id]);
    return res.json({ ok: true, message: "Password changed" });
  } catch (error) {
    console.error("Password change failed:", error);
    return res.status(500).json({ ok: false, error: "Password change failed" });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, error: "API route not found", path: req.originalUrl });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error("Unhandled API error:", err);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database migration failed:", error);
    process.exit(1);
  });
