const express = require("express");
const {
  signup,
  login,
  me,
  refresh,
  logout,
  sessions,
  revokeSession,
  exportAccount,
  deleteAccount
} = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { signupSchema, loginSchema } = require("../validators/auth.validators");
const { authLimiter } = require("../middleware/rate-limit.middleware");

const router = express.Router();

router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.get("/sessions", requireAuth, sessions);
router.delete("/sessions/:sessionId", requireAuth, revokeSession);
router.get("/export", requireAuth, exportAccount);
router.delete("/account", requireAuth, deleteAccount);

module.exports = router;
