const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { moderationDecisionSchema, assetIdParamSchema, paginationQuerySchema } = require("../validators/assets.validators");
const { PERMISSIONS, requirePermission } = require("../security/permissions");
const {
  moderationQueue,
  decideModeration
} = require("../controllers/assets.controller");

const router = express.Router();

router.get("/queue", requireAuth, requirePermission(PERMISSIONS.MODERATION_REVIEW), validate(paginationQuerySchema, "query"), moderationQueue);
router.post(
  "/:assetId/decision",
  requireAuth,
  requirePermission(PERMISSIONS.MODERATION_REVIEW),
  validate(assetIdParamSchema, "params"),
  validate(moderationDecisionSchema),
  decideModeration
);

module.exports = router;
