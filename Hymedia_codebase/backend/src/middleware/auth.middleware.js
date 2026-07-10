const jwt = require("jsonwebtoken");

const ACCESS_COOKIE_NAME = "hymedia_access_token";

function getJwtSecret() {
  return process.env.JWT_SECRET || "HyMedia_Local_Development_Secret";
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
      message: "Please login before performing this action."
    });
  }

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
  const token = getRequestToken(req);

  if (!token) {
    return next();
  }

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
  ACCESS_COOKIE_NAME,
  requireAuth,
  optionalAuth,
  isAdmin,
  getJwtSecret
};
