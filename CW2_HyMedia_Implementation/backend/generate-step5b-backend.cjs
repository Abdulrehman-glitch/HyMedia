const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content.trimStart(), "utf8");
  console.log("Wrote " + filePath);
}

console.log("Generating HyMedia Step 5B backend files...");

ensureDir("src/controllers");
ensureDir("src/routes");
ensureDir("src/services");
ensureDir("src/utils");
ensureDir("src/middleware");

writeFile("src/utils/idGenerator.js", `
import crypto from "crypto";

export const generateAssetId = () => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);

  const randomPart = crypto.randomUUID().split("-")[0];

  return "asset_" + timestamp + "_" + randomPart;
};
`);

writeFile("src/utils/assetValidation.js", `
const allowedVisibilityValues = ["PUBLIC", "PRIVATE", "UNLISTED"];
const allowedMediaTypes = ["image", "video", "audio", "gif"];

const normaliseTags = (tags) => {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags
      .map((tag) => String(tag).trim().toLowerCase())
      .filter(Boolean);
  }

  return String(tags)
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
};

export const validateCreateAssetPayload = (payload) => {
  const errors = [];

  const title = payload.title ? String(payload.title).trim() : "";
  const description = payload.description ? String(payload.description).trim() : "";
  const mediaType = payload.mediaType ? String(payload.mediaType).trim().toLowerCase() : "";
  const visibility = payload.visibility ? String(payload.visibility).trim().toUpperCase() : "PUBLIC";
  const ownerId = payload.ownerId ? String(payload.ownerId).trim() : "demo_user";
  const blobUrl = payload.blobUrl ? String(payload.blobUrl).trim() : "";
  const mimeType = payload.mimeType ? String(payload.mimeType).trim() : "";
  const fileName = payload.fileName ? String(payload.fileName).trim() : "";

  if (!title) {
    errors.push("Title is required.");
  }

  if (title.length > 120) {
    errors.push("Title must not exceed 120 characters.");
  }

  if (description.length > 1000) {
    errors.push("Description must not exceed 1000 characters.");
  }

  if (!mediaType) {
    errors.push("Media type is required.");
  }

  if (mediaType && !allowedMediaTypes.includes(mediaType)) {
    errors.push("Media type must be one of: image, video, audio, gif.");
  }

  if (!allowedVisibilityValues.includes(visibility)) {
    errors.push("Visibility must be one of: PUBLIC, PRIVATE, UNLISTED.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      title,
      description,
      mediaType,
      visibility,
      ownerId,
      blobUrl,
      mimeType,
      fileName,
      tags: normaliseTags(payload.tags),
      isSensitive: Boolean(payload.isSensitive),
      isAdult18Plus: Boolean(payload.isAdult18Plus)
    }
  };
};

export const validateUpdateAssetPayload = (payload) => {
  const errors = [];
  const update = {};

  if (payload.title !== undefined) {
    const title = String(payload.title).trim();

    if (!title) {
      errors.push("Title cannot be empty.");
    }

    if (title.length > 120) {
      errors.push("Title must not exceed 120 characters.");
    }

    update.title = title;
  }

  if (payload.description !== undefined) {
    const description = String(payload.description).trim();

    if (description.length > 1000) {
      errors.push("Description must not exceed 1000 characters.");
    }

    update.description = description;
  }

  if (payload.mediaType !== undefined) {
    const mediaType = String(payload.mediaType).trim().toLowerCase();

    if (!allowedMediaTypes.includes(mediaType)) {
      errors.push("Media type must be one of: image, video, audio, gif.");
    }

    update.mediaType = mediaType;
  }

  if (payload.visibility !== undefined) {
    const visibility = String(payload.visibility).trim().toUpperCase();

    if (!allowedVisibilityValues.includes(visibility)) {
      errors.push("Visibility must be one of: PUBLIC, PRIVATE, UNLISTED.");
    }

    update.visibility = visibility;
  }

  if (payload.tags !== undefined) {
    update.tags = normaliseTags(payload.tags);
  }

  if (payload.blobUrl !== undefined) {
    update.blobUrl = String(payload.blobUrl).trim();
  }

  if (payload.mimeType !== undefined) {
    update.mimeType = String(payload.mimeType).trim();
  }

  if (payload.fileName !== undefined) {
    update.fileName = String(payload.fileName).trim();
  }

  if (payload.isSensitive !== undefined) {
    update.isSensitive = Boolean(payload.isSensitive);
  }

  if (payload.isAdult18Plus !== undefined) {
    update.isAdult18Plus = Boolean(payload.isAdult18Plus);
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: update
  };
};
`);

writeFile("src/services/assetService.js", `
import { generateAssetId } from "../utils/idGenerator.js";
import {
  validateCreateAssetPayload,
  validateUpdateAssetPayload
} from "../utils/assetValidation.js";

const nowIso = () => new Date().toISOString();

const assets = [
  {
    id: "asset_demo_001",
    assetId: "asset_demo_001",
    ownerId: "demo_user",
    title: "Sample HyMedia Image",
    description: "Demo image metadata record used before Azure Blob Storage is connected.",
    mediaType: "image",
    mimeType: "image/jpeg",
    fileName: "sample-image.jpg",
    blobUrl: "https://placehold.co/900x600?text=HyMedia+Image",
    blobName: "demo/sample-image.jpg",
    tags: ["demo", "image", "hymedia"],
    visibility: "PUBLIC",
    isSensitive: false,
    isAdult18Plus: false,
    processingStatus: "READY",
    engagement: {
      likeCount: 0,
      commentCount: 0
    },
    createdAt: "2026-05-04T00:00:00.000Z",
    updatedAt: "2026-05-04T00:00:00.000Z"
  },
  {
    id: "asset_demo_002",
    assetId: "asset_demo_002",
    ownerId: "demo_user",
    title: "Sample HyMedia Video",
    description: "Demo video metadata record used to test filtering and gallery display.",
    mediaType: "video",
    mimeType: "video/mp4",
    fileName: "sample-video.mp4",
    blobUrl: "",
    blobName: "demo/sample-video.mp4",
    tags: ["demo", "video", "cloud"],
    visibility: "PUBLIC",
    isSensitive: false,
    isAdult18Plus: false,
    processingStatus: "READY",
    engagement: {
      likeCount: 0,
      commentCount: 0
    },
    createdAt: "2026-05-04T00:05:00.000Z",
    updatedAt: "2026-05-04T00:05:00.000Z"
  }
];

const sortNewestFirst = (items) => {
  return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getAllAssets = ({ mediaType, tag, search } = {}) => {
  let result = [...assets];

  if (mediaType) {
    result = result.filter(
      (asset) => asset.mediaType.toLowerCase() === String(mediaType).toLowerCase()
    );
  }

  if (tag) {
    result = result.filter((asset) =>
      asset.tags.includes(String(tag).trim().toLowerCase())
    );
  }

  if (search) {
    const searchTerm = String(search).trim().toLowerCase();

    result = result.filter((asset) => {
      const searchableText = [
        asset.title,
        asset.description,
        asset.mediaType,
        asset.visibility,
        ...asset.tags
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchTerm);
    });
  }

  return sortNewestFirst(result);
};

export const getAssetById = (assetId) => {
  return assets.find((asset) => asset.id === assetId || asset.assetId === assetId) || null;
};

export const createAsset = (payload) => {
  const validation = validateCreateAssetPayload(payload);

  if (!validation.isValid) {
    const error = new Error("Asset validation failed.");
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  const id = generateAssetId();
  const timestamp = nowIso();

  const asset = {
    id,
    assetId: id,
    ownerId: validation.value.ownerId,
    title: validation.value.title,
    description: validation.value.description,
    mediaType: validation.value.mediaType,
    mimeType: validation.value.mimeType,
    fileName: validation.value.fileName,
    blobUrl: validation.value.blobUrl,
    blobName: "",
    tags: validation.value.tags,
    visibility: validation.value.visibility,
    isSensitive: validation.value.isSensitive,
    isAdult18Plus: validation.value.isAdult18Plus,
    processingStatus: validation.value.blobUrl ? "READY" : "PENDING_UPLOAD",
    engagement: {
      likeCount: 0,
      commentCount: 0
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };

  assets.push(asset);

  return asset;
};

export const updateAsset = (assetId, payload) => {
  const asset = getAssetById(assetId);

  if (!asset) {
    return null;
  }

  const validation = validateUpdateAssetPayload(payload);

  if (!validation.isValid) {
    const error = new Error("Asset validation failed.");
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  Object.assign(asset, validation.value, {
    updatedAt: nowIso()
  });

  return asset;
};

export const deleteAsset = (assetId) => {
  const assetIndex = assets.findIndex(
    (asset) => asset.id === assetId || asset.assetId === assetId
  );

  if (assetIndex === -1) {
    return null;
  }

  const deletedAssets = assets.splice(assetIndex, 1);

  return deletedAssets[0];
};

export const getAssetStats = () => {
  const totalAssets = assets.length;

  const byMediaType = assets.reduce((summary, asset) => {
    summary[asset.mediaType] = (summary[asset.mediaType] || 0) + 1;
    return summary;
  }, {});

  const byVisibility = assets.reduce((summary, asset) => {
    summary[asset.visibility] = (summary[asset.visibility] || 0) + 1;
    return summary;
  }, {});

  return {
    totalAssets,
    byMediaType,
    byVisibility,
    latestAsset: sortNewestFirst(assets)[0] || null
  };
};
`);

writeFile("src/controllers/assetController.js", `
import {
  createAsset,
  deleteAsset,
  getAllAssets,
  getAssetById,
  getAssetStats,
  updateAsset
} from "../services/assetService.js";

const sendSuccess = (res, statusCode, message, data, meta = undefined) => {
  const response = {
    success: true,
    message,
    data
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

export const listAssets = (req, res, next) => {
  try {
    const assets = getAllAssets({
      mediaType: req.query.mediaType,
      tag: req.query.tag,
      search: req.query.search
    });

    return sendSuccess(res, 200, "Assets retrieved successfully.", assets, {
      count: assets.length,
      filters: {
        mediaType: req.query.mediaType || null,
        tag: req.query.tag || null,
        search: req.query.search || null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAsset = (req, res, next) => {
  try {
    const asset = getAssetById(req.params.assetId);

    if (!asset) {
      const error = new Error("Asset not found.");
      error.statusCode = 404;
      throw error;
    }

    return sendSuccess(res, 200, "Asset retrieved successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const createNewAsset = (req, res, next) => {
  try {
    const asset = createAsset(req.body);

    return sendSuccess(res, 201, "Asset created successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const updateExistingAsset = (req, res, next) => {
  try {
    const asset = updateAsset(req.params.assetId, req.body);

    if (!asset) {
      const error = new Error("Asset not found.");
      error.statusCode = 404;
      throw error;
    }

    return sendSuccess(res, 200, "Asset updated successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const deleteExistingAsset = (req, res, next) => {
  try {
    const asset = deleteAsset(req.params.assetId);

    if (!asset) {
      const error = new Error("Asset not found.");
      error.statusCode = 404;
      throw error;
    }

    return sendSuccess(res, 200, "Asset deleted successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const getStats = (req, res, next) => {
  try {
    const stats = getAssetStats();

    return sendSuccess(res, 200, "Asset statistics retrieved successfully.", stats);
  } catch (error) {
    next(error);
  }
};
`);

writeFile("src/routes/assetRoutes.js", `
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
`);

writeFile("src/middleware/errorHandler.js", `
export const notFoundHandler = (req, res, next) => {
  const error = new Error("Route not found: " + req.method + " " + req.originalUrl);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  console.error("API Error:", {
    message: error.message,
    statusCode,
    method: req.method,
    path: req.originalUrl,
    details: error.details,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  });

  const response = {
    success: false,
    message: statusCode === 500 ? "Internal server error" : error.message,
    statusCode,
    timestamp: new Date().toISOString()
  };

  if (error.details) {
    response.details = error.details;
  }

  res.status(statusCode).json(response);
};
`);

writeFile("src/app.js", `
import express from "express";
import cors from "cors";
import morgan from "morgan";

import { env, isProduction } from "./config/env.js";
import healthRoutes from "./routes/healthRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(morgan(isProduction ? "combined" : "dev"));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "HyMedia Backend API is running.",
    documentation: "/api/v1/health",
    apiBase: "/api/v1",
    availableEndpoints: [
      "GET /api/v1/health",
      "GET /api/v1/assets",
      "GET /api/v1/assets/stats",
      "GET /api/v1/assets/:assetId",
      "POST /api/v1/assets",
      "PUT /api/v1/assets/:assetId",
      "DELETE /api/v1/assets/:assetId"
    ],
    timestamp: new Date().toISOString()
  });
});

app.use("/api/v1", healthRoutes);
app.use("/api/v1", assetRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
`);

writeFile("README.md", `
# HyMedia Backend API

Backend API for the COM682 CW2 HyMedia cloud-native multimedia sharing platform.

## Current stage

Step 5B: Local Asset CRUD API using temporary in-memory data.

## Local URL

http://localhost:5000

## Endpoints

GET     /api/v1/health
GET     /api/v1/assets
GET     /api/v1/assets/stats
GET     /api/v1/assets/:assetId
POST    /api/v1/assets
PUT     /api/v1/assets/:assetId
DELETE  /api/v1/assets/:assetId

## Run locally

npm run dev

## Notes

The current asset service uses temporary in-memory data. In the next implementation stages, the service layer will be replaced with Azure Blob Storage for binary media files and Azure Cosmos DB for metadata.
`);

console.log("Step 5B backend files generated successfully.");
console.log("Run: npm run dev");