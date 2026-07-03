const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return process.env.JWT_SECRET || "HyMedia_Local_Development_Secret";
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Please login before performing this action."
    });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    req.user = jwt.verify(token, getJwtSecret());
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired login token. Please login again."
    });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    req.user = jwt.verify(token, getJwtSecret());
  } catch (error) {
    req.user = null;
  }

  return next();
}

function isAdmin(user) {
  return user?.role === "admin";
}

module.exports = {
  requireAuth,
  optionalAuth,
  isAdmin,
  getJwtSecret
};
