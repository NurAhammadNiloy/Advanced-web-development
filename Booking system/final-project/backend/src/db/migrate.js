import pool from "./pool.js";

export async function runMigrations() {
  await pool.query("SELECT 1");
}
