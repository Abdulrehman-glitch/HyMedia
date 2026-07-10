const rateLimit = require("express-rate-limit");

const standardResponse = (message) => ({
  success: false,
  message
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: standardResponse("Too many requests. Please slow down and try again shortly.")
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: standardResponse("Too many login attempts. Please wait before trying again.")
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req, res) => req.user?.userId || req.ip,
  message: standardResponse("Upload limit reached. Please wait before uploading more media.")
});

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter
};
