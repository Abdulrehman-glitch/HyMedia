const express = require("express");
const upload = require("../middleware/upload.middleware");
const { requireAuth } = require("../middleware/auth.middleware");

const {
  listAssets,
  getSingleAsset,
  createNewAsset,
  uploadAsset,
  streamAssetMedia,
  updateExistingAsset,
  deleteExistingAsset,
  assetStats
} = require("../controllers/assets.controller");

const router = express.Router();

router.get("/", listAssets);
router.get("/stats", assetStats);
router.get("/:assetId/media", streamAssetMedia);
router.get("/:assetId", getSingleAsset);

router.post("/", requireAuth, createNewAsset);
router.post("/upload", requireAuth, upload.any(), uploadAsset);
router.put("/:assetId", requireAuth, updateExistingAsset);
router.delete("/:assetId", requireAuth, deleteExistingAsset);

module.exports = router;