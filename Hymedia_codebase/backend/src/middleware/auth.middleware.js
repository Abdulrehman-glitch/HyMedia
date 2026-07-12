const jwt = require("jsonwebtoken");
const {
  PERMISSIONS,
  hasPermission,
  requirePermission,
  normalizeRole
} = require("../security/permissions");

const ACCESS_COOKIE_NAME = "hymedia_access_token";

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    const error = new Error("JWT_SECRET is missing. Configure it in App Service settings or local .env.");
    error.status = 500;
    error.code = "CONFIG_JWT_SECRET_MISSING";
    throw error;
  }

  return process.env.JWT_SECRET;
}

function getRequestToken(req) {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  return req.cookies?.[ACCESS_COOKIE_NAME] || "";
}

function requireAuth(req, res, next) {
  const token = getRequestToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      code: "UNAUTHENTICATED",
      requestId: req.requestId,
      message: "Please login before performing this action."
    });
  }

  try {
    req.user = jwt.verify(token, getJwtSecret());
    return next();
  } catch (error) {
    if (error.code === "CONFIG_JWT_SECRET_MISSING") {
      return next(error);
    }

    return res.status(401).json({
      success: false,
      code: "UNAUTHENTICATED",
      requestId: req.requestId,
      message: "Invalid or expired login token. Please login again."
    });
  }
}

function optionalAuth(req, res, next) {
  const token = getRequestToken(req);

  if (!token) {
    return next();
  }

  try {
    req.user = jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (error.code === "CONFIG_JWT_SECRET_MISSING") {
      return next(error);
    }

    req.user = null;
  }

  return next();
}

function isAdmin(user) {
  return [normalizeRole("admin"), normalizeRole("platform_admin")].includes(normalizeRole(user?.role));
}

function isModerator(user) {
  return hasPermission(user, PERMISSIONS.MODERATION_REVIEW);
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHENTICATED",
        requestId: req.requestId,
        message: "Please login before performing this action."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        requestId: req.requestId,
        message: "You do not have permission to perform this action."
      });
    }

    return next();
  };
}

module.exports = {
  ACCESS_COOKIE_NAME,
  requireAuth,
  optionalAuth,
  requireRole,
  requirePermission,
  isAdmin,
  isModerator,
  getJwtSecret,
  hasPermission
};
