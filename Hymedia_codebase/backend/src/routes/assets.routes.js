const express = require("express");
const upload = require("../middleware/upload.middleware");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { uploadLimiter } = require("../middleware/rate-limit.middleware");
const {
  assetCreateSchema,
  assetUpdateSchema,
  reportAssetSchema
} = require("../validators/assets.validators");

const {
  listAssets,
  getSingleAsset,
  createNewAsset,
  uploadAsset,
  streamAssetMedia,
  updateExistingAsset,
  deleteExistingAsset,
  assetStats,
  reportAsset
} = require("../controllers/assets.controller");

const router = express.Router();

router.get("/", optionalAuth, listAssets);
router.get("/stats", optionalAuth, assetStats);
router.get("/:assetId/media", optionalAuth, streamAssetMedia);
router.get("/:assetId", optionalAuth, getSingleAsset);

router.post("/", requireAuth, validate(assetCreateSchema), createNewAsset);
router.post("/upload", requireAuth, uploadLimiter, upload.single("file"), uploadAsset);
router.post("/:assetId/report", requireAuth, validate(reportAssetSchema), reportAsset);
router.put("/:assetId", requireAuth, validate(assetUpdateSchema), updateExistingAsset);
router.delete("/:assetId", requireAuth, deleteExistingAsset);

module.exports = router;
