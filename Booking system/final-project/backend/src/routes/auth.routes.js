import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db/pool.js";
import { validationResult } from "express-validator";
import {
  registerValidators,
  loginValidators,
} from "../validators/auth.validators.js";
import { logEvent } from "../services/log.service.js";

const router = express.Router();

const authCookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/* =====================================================
   REGISTER
===================================================== */
router.post("/register", registerValidators, async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok: false,
      errors: errors.array().map((e) => ({
        field: e.path,
        msg: e.msg,
      })),
    });
  }

  const { firstName, lastName, email, password, role = "reserver", dob, website } = req.body;

  if (website) {
    return res.status(400).json({
      ok: false,
      error: "Registration could not be completed.",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const insertSql = `
      INSERT INTO users (first_name, last_name, email, password_hash, role, dob)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, first_name, last_name, email, role, dob, created_at
    `;

    const params = [
      firstName,
      lastName,
      email.toLowerCase().trim(),
      passwordHash,
      role,
      dob || null,
    ];

    const { rows } = await pool.query(insertSql, params);
    const user = rows[0];

    await logEvent({
      actorUserId: user.id,
      action: "register",
      message: `User registered (ID ${user.id})`,
      entityType: "user",
      entityId: user.id,
    });

    return res.status(201).json({
      ok: true,
      data: user,
    });
  } catch (err) {
    if (err?.code === "23505") {
      await logEvent({
        actorUserId: null,
        action: "register",
        message: `Duplicate user registration blocked (${email})`,
        entityType: "user",
        entityId: null,
      });

      return res.status(409).json({
        ok: false,
        error: "Email already in use",
      });
    }

    console.error("REGISTER failed:", err);
    return res.status(500).json({
      ok: false,
      error: "Database error",
    });
  }
});

/* =====================================================
   LOGIN
===================================================== */
router.post("/login", loginValidators, async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok: false,
      errors: errors.array().map((e) => ({
        field: e.path,
        msg: e.msg,
      })),
    });
  }

  const { email, password, website } = req.body;

  if (website) {
    return res.status(400).json({
      ok: false,
      error: "Sign in could not be completed.",
    });
  }

  try {
    const sql = `
      SELECT id, first_name, last_name, email, password_hash, role, dob, created_at, is_active
      FROM users
      WHERE email = $1
      LIMIT 1
    `;

    const { rows } = await pool.query(sql, [email.toLowerCase().trim()]);

    if (rows.length === 0) {
      await logEvent({
        actorUserId: null,
        action: "login",
        message: `Login failed: unknown email (${email})`,
        entityType: "user",
        entityId: null,
      });

      return res.status(401).json({
        ok: false,
        error: "Invalid email or password",
      });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ ok: false, error: "This account is inactive. Please contact support." });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      await logEvent({
        actorUserId: user.id,
        action: "login",
        message: `Login failed: wrong password (ID ${user.id})`,
        entityType: "user",
        entityId: user.id,
      });

      return res.status(401).json({
        ok: false,
        error: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        dob: user.dob,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "2h",
      }
    );

    await logEvent({
      actorUserId: user.id,
      action: "login",
      message: `User logged in (ID ${user.id})`,
      entityType: "user",
      entityId: user.id,
    });

    res.cookie("token", token, {
      ...authCookieOptions,
      maxAge: 2 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      ok: true,
      token,
      data: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        dob: user.dob,
      },
    });
  } catch (err) {
    console.error("LOGIN failed:", err);
    return res.status(500).json({
      ok: false,
      error: "Database error",
    });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", authCookieOptions);
  return res.status(200).json({ ok: true });
});

export default router;
