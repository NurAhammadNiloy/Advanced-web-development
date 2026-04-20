// src/db/pool.js
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "appdb",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "apppassword",
});
export default pool;