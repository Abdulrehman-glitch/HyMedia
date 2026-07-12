const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { moderationDecisionSchema } = require("../validators/assets.validators");
const {
  moderationQueue,
  decideModeration
} = require("../controllers/assets.controller");

const router = express.Router();

router.get("/queue", requireAuth, requireRole("moderator", "admin"), moderationQueue);
router.post(
  "/:assetId/decision",
  requireAuth,
  requireRole("moderator", "admin"),
  validate(moderationDecisionSchema),
  decideModeration
);

module.exports = router;
