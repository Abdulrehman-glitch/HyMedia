const express = require("express");
const upload = require("../middleware/upload.middleware");

const {
  listAssets,
  getSingleAsset,
  createNewAsset,
  uploadAsset,
  updateExistingAsset,
  deleteExistingAsset,
  assetStats
} = require("../controllers/assets.controller");

const router = express.Router();

router.get("/", listAssets);
router.get("/stats", assetStats);
router.get("/:assetId", getSingleAsset);
router.post("/", createNewAsset);
router.post("/upload", upload.any(), uploadAsset);
router.put("/:assetId", updateExistingAsset);
router.delete("/:assetId", deleteExistingAsset);

module.exports = router;