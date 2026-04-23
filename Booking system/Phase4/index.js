require("dotenv").config();
const express = require("express");
const app = express();
const PORT = Number(process.env.IPORT || process.env.PORT || 5000);
const path = require("path");
const { Pool } = require("pg");
const { body, matchedData, validationResult } = require("express-validator");

// Timestamp
function timestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').replace('Z', '');
}

// --- Middleware ---
app.use(express.json()); // Parse application/json

// Serve everything in ./public as static assets
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// --- Views (HTML pages) ---
// GET / -> serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Optional: GET /resources -> serve resources.html directly
app.get("/resources", (req, res) => {
  res.sendFile(path.join(publicDir, "resources.html"));
});

// --- Postgres pool (reads PG* from .env) ---
const pool = new Pool({});

// --- express-validator rules for the payload ---
const resourceValidators = [
  body().isObject({ strict: true }).withMessage("Request body must be a JSON object"),

  body("action")
    .exists({ checkFalsy: true }).withMessage("action is required")
    .bail()
    .isString().withMessage("action must be a string")
    .trim()
    .isIn(["create"])
    .withMessage("action must be 'create'"),

  body("resourceName")
    .exists({ checkFalsy: true }).withMessage("resourceName is required")
    .bail()
    .isString().withMessage("resourceName must be a string")
    .bail()
    .trim()
    .customSanitizer((value) => value.replace(/\s+/g, " "))
    .isLength({ min: 5, max: 30 }).withMessage("resourceName must be 5-30 characters")
    .bail()
    .matches(/^[a-zA-Z0-9\u00e4\u00f6\u00e5\u00c4\u00d6\u00c5 ]+$/)
    .withMessage("resourceName contains invalid characters"),

  body("resourceDescription")
    .exists({ checkFalsy: true }).withMessage("resourceDescription is required")
    .bail()
    .isString().withMessage("resourceDescription must be a string")
    .bail()
    .trim()
    .customSanitizer((value) => value.replace(/\s+/g, " "))
    .isLength({ min: 10, max: 50 }).withMessage("resourceDescription must be 10-50 characters")
    .bail()
    .matches(/^[a-zA-Z0-9\u00e4\u00f6\u00e5\u00c4\u00d6\u00c5 ]+$/)
    .withMessage("resourceDescription contains invalid characters"),

  body("resourceAvailable")
    .exists().withMessage("resourceAvailable is required")
    .bail()
    .isBoolean().withMessage("resourceAvailable must be boolean")
    .toBoolean(), // coercion

  body("resourcePrice")
    .exists().withMessage("resourcePrice is required")
    .bail()
    .isFloat({ min: 0 }).withMessage("resourcePrice must be a non-negative number")
    .toFloat(), // coercion

  body("resourcePriceUnit")
    .exists({ checkFalsy: true }).withMessage("resourcePriceUnit is required")
    .bail()
    .isString().withMessage("resourcePriceUnit must be a string")
    .trim()
    .isIn(["hour", "day", "week", "month"])
    .withMessage("resourcePriceUnit must be 'hour', 'day', 'week', or 'month'"),
];

function sendValidationErrors(req, res) {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return null;
  }

  return res.status(400).json({
    ok: false,
    errors: errors.array({ onlyFirstError: true }).map((error) => ({
      field: error.path || "body",
      msg: error.msg,
    })),
  });
}

// POST /api/resources -> create (minimal)
app.post("/api/resources", resourceValidators, async (req, res) => {
  const validationResponse = sendValidationErrors(req, res);
  if (validationResponse) {
    return validationResponse;
  }

  const {
    action,
    resourceName,
    resourceDescription,
    resourceAvailable,
    resourcePrice,
    resourcePriceUnit,
  } = matchedData(req, { locations: ["body"] });

  // Log (optional)
  console.log("The client's POST request ", `[${timestamp()}]`);
  console.log("------------------------------");
  console.log("Action ➡️ ", action);
  console.log("Name ➡️ ", resourceName);
  console.log("Description ➡️ ", resourceDescription);
  console.log("Availability ➡️ ", resourceAvailable);
  console.log("Price ➡️ ", resourcePrice);
  console.log("Price unit ➡️ ", resourcePriceUnit);
  console.log("------------------------------");

  try {
    const insertSql = `
      INSERT INTO resources (name, description, available, price, price_unit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, available, price, price_unit, created_at
    `;
    const params = [
      resourceName,
      resourceDescription,
      resourceAvailable,
      resourcePrice,
      resourcePriceUnit,
    ];

    const { rows } = await pool.query(insertSql, params);
    const created = rows[0];

    return res.status(201).json({ ok: true, data: created });
  } catch (err) {
    console.error("DB insert failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }
});

// --- Fallback 404 for unknown API routes ---
app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      ok: false,
      errors: [{ field: "body", msg: "Malformed JSON payload" }],
    });
  }

  return next(err);
});

// --- Start server ---
async function startServer() {
  try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database:", error.message);
    process.exit(1);
  }
}

startServer();
