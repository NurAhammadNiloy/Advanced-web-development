// src/routes/reservations.routes.js
import express from "express";
import pool from "../db/pool.js";
import { logEvent } from "../services/log.service.js";

const router = express.Router();

/* =====================================================
   CREATE
   POST /api/reservations
===================================================== */
router.post("/", async (req, res) => {
  const actorUserId = req.user.id;

  const {
    resourceId,
    startTime,
    endTime,
    note,
    status
  } = req.body;

  // Strong input validation
  if (!Number.isInteger(resourceId) || resourceId < 1) {
    return res.status(400).json({ ok: false, error: "Invalid resourceId" });
  }
  if (!startTime || !endTime) {
    return res.status(400).json({ ok: false, error: "Start and end time required" });
  }
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ ok: false, error: "Invalid date format" });
  }
  if (end <= start) {
    return res.status(400).json({ ok: false, error: "End time must be after start time" });
  }
  if (note && typeof note !== "string") {
    return res.status(400).json({ ok: false, error: "Note must be string" });
  }
  const allowedStatus = ["active", "cancelled", "completed"];
  if (status && !allowedStatus.includes(status)) {
    return res.status(400).json({ ok: false, error: "Invalid status value" });
  }

  try {
    const { rows: resources } = await pool.query(
      "SELECT id, available FROM resources WHERE id = $1 LIMIT 1",
      [resourceId]
    );
    if (resources.length === 0) {
      return res.status(404).json({ ok: false, error: "Resource not found" });
    }
    if (!resources[0].available) {
      return res.status(409).json({ ok: false, error: "This resource is currently unavailable." });
    }

    const { rows: overlaps } = await pool.query(
      `SELECT id FROM reservations
       WHERE resource_id = $1
         AND status = 'active'
         AND tstzrange(start_time, end_time, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
       LIMIT 1`,
      [resourceId, start.toISOString(), end.toISOString()]
    );
    if (overlaps.length > 0) {
      return res.status(409).json({ ok: false, error: "This resource is already booked for that time." });
    }

    const insertSql = `
      INSERT INTO reservations
      (resource_id, user_id, start_time, end_time, note, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const params = [
      resourceId,
      actorUserId,
      start.toISOString(),
      end.toISOString(),
      note || null,
      status || "active"
    ];

    const { rows } = await pool.query(insertSql, params);

    await logEvent({
      actorUserId,
      action: "reserve",
      message: `Reservation created (ID ${rows[0].id})`,
      entityType: "reservation",
      entityId: rows[0].id,
    });

    return res.status(201).json({ ok: true, data: rows[0] });

  } catch (err) {
    // Log error details for debugging
    await logEvent({
      actorUserId: req.user?.id || null,
      action: "reserve",
      message: `Reservation create failed: ${err.message}`,
      entityType: "reservation",
      entityId: null,
    });
    console.error("DB insert failed:", err);
    return res.status(500).json({ ok: false, error: "Database error", details: err.message });
  }
});


/* =====================================================
   READ ALL
   GET /api/reservations
===================================================== */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const sql = `
      SELECT
        r.*,
        u.email AS user_email,
        res.name AS resource_name
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN resources res ON r.resource_id = res.id
      WHERE r.user_id = $1
      ORDER BY r.start_time DESC
    `;
    const { rows } = await pool.query(sql, [userId]);
    return res.status(200).json({ ok: true, data: rows });
  } catch (err) {
    console.error("READ ALL failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }
});


/* =====================================================
   READ ONE
   GET /api/reservations/:id
===================================================== */
router.get("/:id", async (req, res) => {

  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ ok: false, error: "Invalid ID" });
  }

  try {

    const sql = `
      SELECT
        r.*,
        u.email AS user_email,
        res.name AS resource_name
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN resources res ON r.resource_id = res.id
      WHERE r.id = $1 AND (r.user_id = $2 OR $3 = ANY(ARRAY['manager','administrator']))
    `;

    const { rows } = await pool.query(sql, [id, req.user.id, req.user.role]);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Reservation not found" });
    }

    return res.status(200).json({ ok: true, data: rows[0] });

  } catch (err) {
    console.error("READ ONE failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }

});


/* =====================================================
   UPDATE
   PUT /api/reservations/:id
===================================================== */
router.put("/:id", async (req, res) => {

  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ ok: false, error: "Invalid ID" });
  }

  const actorUserId = req.user.id;

  const {
    resourceId,
    startTime,
    endTime,
    note,
    status
  } = req.body;

  try {

    const sql = `
      UPDATE reservations
      SET resource_id = $1,
          start_time = $2,
          end_time = $3,
          note = $4,
          status = $5
      WHERE id = $6 AND (user_id = $7 OR $8 = ANY(ARRAY['manager','administrator']))
      RETURNING *
    `;

    const params = [
      Number(resourceId),
      startTime,
      endTime,
      note || null,
      status || "active",
      id,
      req.user.id,
      req.user.role
    ];

    const { rows } = await pool.query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Reservation not found" });
    }

    await logEvent({
      actorUserId,
      action: "reserve",
      message: `Reservation updated (ID ${id})`,
      entityType: "reservation",
      entityId: id,
    });

    return res.status(200).json({ ok: true, data: rows[0] });

  } catch (err) {
    console.error("UPDATE failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }

});


/* =====================================================
   DELETE
   DELETE /api/reservations/:id
===================================================== */
router.delete("/:id", async (req, res) => {

  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ ok: false, error: "Invalid ID" });
  }

  const actorUserId = req.user.id;

  try {

    const { rowCount } = await pool.query(
      "DELETE FROM reservations WHERE id = $1 AND (user_id = $2 OR $3 = ANY(ARRAY['manager','administrator']))",
      [id, req.user.id, req.user.role]
    );

    if (rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Reservation not found" });
    }

    await logEvent({
      actorUserId,
      action: "reserve",
      message: `Reservation deleted (ID ${id})`,
      entityType: "reservation",
      entityId: id,
    });

    return res.status(204).send();

  } catch (err) {
    console.error("DELETE failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }

});


export default router;
