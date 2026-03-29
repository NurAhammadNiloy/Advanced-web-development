import jwt from "jsonwebtoken";

function parseCookieHeader(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const index = pair.indexOf("=");
      if (index < 0) return acc;

      const key = decodeURIComponent(pair.slice(0, index).trim());
      const value = decodeURIComponent(pair.slice(index + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

function extractToken(req) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  const cookies = parseCookieHeader(req.headers.cookie || "");
  return cookies.token || null;
}

function buildUserFromToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  return {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    firstName: decoded.firstName,
    lastName: decoded.lastName,
  };
}

export function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "Authentication required",
    });
  }

  try {
    req.user = buildUserFromToken(token);

    next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: "Invalid or expired token",
    });
  }
}

export function requireAuthPage(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.redirect("/login");
  }

  try {
    req.user = buildUserFromToken(token);
    next();
  } catch (err) {
    return res.redirect("/login");
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: "Forbidden",
      });
    }

    next();
  };
}