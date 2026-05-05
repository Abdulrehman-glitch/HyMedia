import express from "express";

import {
  createNewAsset,
  deleteExistingAsset,
  getAsset,
  getStats,
  getUploadRules,
  listAssets,
  updateExistingAsset,
  uploadNewAsset
} from "../controllers/assetController.js";
import { uploadSingleMedia } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/assets/stats", getStats);
router.get("/assets/upload-rules", getUploadRules);
router.get("/assets", listAssets);
router.get("/assets/:assetId", getAsset);
router.post("/assets", createNewAsset);
router.post("/assets/upload", uploadSingleMedia, uploadNewAsset);
router.put("/assets/:assetId", updateExistingAsset);
router.delete("/assets/:assetId", deleteExistingAsset);

export default router;
