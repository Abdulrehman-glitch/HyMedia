import express from "express";

import {
  createNewAsset,
  deleteExistingAsset,
  getAsset,
  getStats,
  listAssets,
  updateExistingAsset
} from "../controllers/assetController.js";

const router = express.Router();

router.get("/assets/stats", getStats);
router.get("/assets", listAssets);
router.get("/assets/:assetId", getAsset);
router.post("/assets", createNewAsset);
router.put("/assets/:assetId", updateExistingAsset);
router.delete("/assets/:assetId", deleteExistingAsset);

export default router;
