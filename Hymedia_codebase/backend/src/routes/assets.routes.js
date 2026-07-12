const express = require("express");
const upload = require("../middleware/upload.middleware");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { uploadLimiter } = require("../middleware/rate-limit.middleware");
const {
  assetCreateSchema,
  assetUpdateSchema,
  reportAssetSchema,
  shareLinkCreateSchema,
  assetIdParamSchema,
  shareTokenParamSchema,
  shareIdParamSchema,
  paginationQuerySchema,
  assetListQuerySchema
} = require("../validators/assets.validators");
const { PERMISSIONS, requirePermission } = require("../security/permissions");

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

router.get("/", optionalAuth, validate(assetListQuerySchema, "query"), listAssets);
router.get("/stats", optionalAuth, assetStats);
router.get("/recycle-bin", requireAuth, validate(paginationQuerySchema, "query"), recycleBin);
router.get("/share/:token/media", validate(shareTokenParamSchema, "params"), streamSharedAssetMedia);
router.get("/:assetId/media", optionalAuth, validate(assetIdParamSchema, "params"), streamAssetMedia);
router.get("/:assetId", optionalAuth, validate(assetIdParamSchema, "params"), getSingleAsset);

router.post("/", requireAuth, requirePermission(PERMISSIONS.ASSET_CREATE), validate(assetCreateSchema), createNewAsset);
router.post("/upload", requireAuth, requirePermission(PERMISSIONS.ASSET_CREATE), uploadLimiter, upload.single("file"), uploadAsset);
router.get("/:assetId/share-links", requireAuth, validate(assetIdParamSchema, "params"), listAssetShareLinks);
router.post("/:assetId/share-links", requireAuth, validate(assetIdParamSchema, "params"), validate(shareLinkCreateSchema), createAssetShareLink);
router.post("/:assetId/report", requireAuth, validate(assetIdParamSchema, "params"), validate(reportAssetSchema), reportAsset);
router.post("/:assetId/restore", requireAuth, validate(assetIdParamSchema, "params"), restoreDeletedAsset);
router.delete("/:assetId/purge", requireAuth, validate(assetIdParamSchema, "params"), purgeDeletedAsset);
router.delete("/share-links/:shareId", requireAuth, validate(shareIdParamSchema, "params"), revokeAssetShareLink);
router.put("/:assetId", requireAuth, validate(assetIdParamSchema, "params"), validate(assetUpdateSchema), updateExistingAsset);
router.delete("/:assetId", requireAuth, validate(assetIdParamSchema, "params"), deleteExistingAsset);

module.exports = router;
