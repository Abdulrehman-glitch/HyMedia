const express = require("express");
const upload = require("../middleware/upload.middleware");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { uploadLimiter } = require("../middleware/rate-limit.middleware");
const {
  assetCreateSchema,
  assetUpdateSchema,
  reportAssetSchema,
  shareLinkCreateSchema
} = require("../validators/assets.validators");

const {
  listAssets,
  getSingleAsset,
  createNewAsset,
  uploadAsset,
  streamAssetMedia,
  updateExistingAsset,
  deleteExistingAsset,
  restoreDeletedAsset,
  purgeDeletedAsset,
  recycleBin,
  assetStats,
  reportAsset,
  createAssetShareLink,
  listAssetShareLinks,
  revokeAssetShareLink,
  streamSharedAssetMedia
} = require("../controllers/assets.controller");

const router = express.Router();

router.get("/", optionalAuth, listAssets);
router.get("/stats", optionalAuth, assetStats);
router.get("/recycle-bin", requireAuth, recycleBin);
router.get("/share/:token/media", streamSharedAssetMedia);
router.get("/:assetId/media", optionalAuth, streamAssetMedia);
router.get("/:assetId", optionalAuth, getSingleAsset);

router.post("/", requireAuth, validate(assetCreateSchema), createNewAsset);
router.post("/upload", requireAuth, uploadLimiter, upload.single("file"), uploadAsset);
router.get("/:assetId/share-links", requireAuth, listAssetShareLinks);
router.post("/:assetId/share-links", requireAuth, validate(shareLinkCreateSchema), createAssetShareLink);
router.post("/:assetId/report", requireAuth, validate(reportAssetSchema), reportAsset);
router.post("/:assetId/restore", requireAuth, restoreDeletedAsset);
router.delete("/:assetId/purge", requireAuth, purgeDeletedAsset);
router.delete("/share-links/:shareId", requireAuth, revokeAssetShareLink);
router.put("/:assetId", requireAuth, validate(assetUpdateSchema), updateExistingAsset);
router.delete("/:assetId", requireAuth, deleteExistingAsset);

module.exports = router;
