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

module.exports = {
  requireAuth,
  getJwtSecret
};