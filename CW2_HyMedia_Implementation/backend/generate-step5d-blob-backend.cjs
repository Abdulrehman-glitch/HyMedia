const fs = require("fs");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content.trimStart(), "utf8");
  console.log("Updated " + filePath);
}

console.log("Generating Step 5D Azure Blob Storage backend integration...");

ensureDir("src/config");
ensureDir("src/services");
ensureDir("src/middleware");
ensureDir("src/utils");
ensureDir("src/controllers");
ensureDir("src/routes");

writeFile("src/config/blobClient.js", `
import { BlobServiceClient } from "@azure/storage-blob";
import { env } from "./env.js";

export const getBlobContainerClient = async () => {
  if (!env.azureStorageConnectionString) {
    const error = new Error("Azure Storage connection string is missing. Check AZURE_STORAGE_CONNECTION_STRING in .env.");
    error.statusCode = 500;
    throw error;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    env.azureStorageConnectionString
  );

  const containerClient = blobServiceClient.getContainerClient(
    env.azureStorageContainerName
  );

  await containerClient.createIfNotExists();

  return containerClient;
};
`);

writeFile("src/utils/fileValidation.js", `
const maxFileSizeBytes = 25 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/mp4",
  "audio/ogg"
]);

const mimeToMediaType = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "gif",
  "image/webp": "image",
  "image/bmp": "image",
  "image/tiff": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "video/x-matroska": "video",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/aac": "audio",
  "audio/mp4": "audio",
  "audio/ogg": "audio"
};

export const validateUploadedFile = (file) => {
  const errors = [];

  if (!file) {
    errors.push("Media file is required.");
    return {
      isValid: false,
      errors
    };
  }

  if (file.size > maxFileSizeBytes) {
    errors.push("File size must not exceed 25MB for the coursework demo.");
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    errors.push("Unsupported file type. HyMedia supports images, GIFs, videos and audio files.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const detectMediaType = (mimeType) => {
  return mimeToMediaType[mimeType] || "image";
};

export const getAllowedUploadSummary = () => {
  return {
    maxFileSizeMb: 25,
    supportedTypes: [
      "Images: JPG, JPEG, PNG, GIF, WEBP, BMP, TIFF",
      "Videos: MP4, MOV, WEBM, MKV",
      "Audio: MP3, WAV, AAC/M4A, OGG"
    ]
  };
};
`);

writeFile("src/middleware/uploadMiddleware.js", `
import multer from "multer";

const storage = multer.memoryStorage();

export const uploadSingleMedia = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
}).single("file");
`);

writeFile("src/services/blobService.js", `
import path from "path";
import { getBlobContainerClient } from "../config/blobClient.js";

const cleanFileName = (fileName) => {
  const parsed = path.parse(fileName);
  const safeBase = parsed.name
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 80);

  const safeExt = parsed.ext.toLowerCase();

  return (safeBase || "media-file") + safeExt;
};

export const uploadFileToBlob = async ({ file, assetId, ownerId }) => {
  const containerClient = await getBlobContainerClient();

  const safeFileName = cleanFileName(file.originalname);
  const timestamp = Date.now();

  const blobName = [
    "assets",
    ownerId || "demo_user",
    assetId,
    "original-" + timestamp + "-" + safeFileName
  ].join("/");

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype
    },
    metadata: {
      assetId,
      ownerId: ownerId || "demo_user",
      originalFileName: file.originalname
    }
  });

  return {
    blobName,
    blobUrl: blockBlobClient.url,
    fileName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size
  };
};
`);

writeFile("src/services/assetService.js", `
import { generateAssetId } from "../utils/idGenerator.js";
import {
  validateCreateAssetPayload,
  validateUpdateAssetPayload
} from "../utils/assetValidation.js";
import { detectMediaType, validateUploadedFile } from "../utils/fileValidation.js";
import { uploadFileToBlob } from "./blobService.js";

const nowIso = () => new Date().toISOString();

const assets = [
  {
    id: "asset_demo_001",
    assetId: "asset_demo_001",
    ownerId: "demo_user",
    title: "London Street Photography",
    caption: "A HyMedia demo post showing image upload metadata with hashtags and location.",
    description: "Demo image metadata record used before Azure Blob Storage is connected.",
    mediaType: "image",
    mimeType: "image/jpeg",
    fileName: "london-street.jpg",
    blobUrl: "https://placehold.co/900x600?text=HyMedia+Image+Post",
    blobName: "demo/london-street.jpg",
    hashtags: ["#london", "#photography", "#hymedia"],
    tags: ["#london", "#photography", "#hymedia"],
    taggedUsers: ["@demo_creator"],
    locationName: "London, UK",
    visibility: "PUBLIC",
    isSensitive: false,
    isAdult18Plus: false,
    allowComments: true,
    processingStatus: "READY",
    engagement: {
      likeCount: 12,
      commentCount: 3
    },
    ai: {
      tags: [],
      moderationLabels: ["not_checked"],
      embeddingRef: null
    },
    createdAt: "2026-05-04T00:00:00.000Z",
    updatedAt: "2026-05-04T00:00:00.000Z"
  },
  {
    id: "asset_demo_002",
    assetId: "asset_demo_002",
    ownerId: "demo_user",
    title: "Creator Premium Video Preview",
    caption: "Premium-only video metadata example for the HyMedia creator monetization model.",
    description: "Demo video metadata record used to test privacy badges and gallery display.",
    mediaType: "video",
    mimeType: "video/mp4",
    fileName: "creator-preview.mp4",
    blobUrl: "",
    blobName: "demo/creator-preview.mp4",
    hashtags: ["#creator", "#premium", "#video"],
    tags: ["#creator", "#premium", "#video"],
    taggedUsers: ["@premium_creator"],
    locationName: "Harrow, London",
    visibility: "CREATOR_PREMIUM",
    isSensitive: false,
    isAdult18Plus: false,
    allowComments: true,
    processingStatus: "READY",
    engagement: {
      likeCount: 42,
      commentCount: 8
    },
    ai: {
      tags: [],
      moderationLabels: ["not_checked"],
      embeddingRef: null
    },
    createdAt: "2026-05-04T00:05:00.000Z",
    updatedAt: "2026-05-04T00:05:00.000Z"
  },
  {
    id: "asset_demo_003",
    assetId: "asset_demo_003",
    ownerId: "demo_user",
    title: "Sensitive Audio Clip",
    caption: "Demo audio post showing sensitive-content metadata and moderation readiness.",
    description: "Audio example aligned with HyMedia sensitive content preferences.",
    mediaType: "audio",
    mimeType: "audio/mpeg",
    fileName: "sensitive-audio.mp3",
    blobUrl: "",
    blobName: "demo/sensitive-audio.mp3",
    hashtags: ["#audio", "#moderation", "#demo"],
    tags: ["#audio", "#moderation", "#demo"],
    taggedUsers: [],
    locationName: "Manchester, UK",
    visibility: "UNLISTED_LINK",
    isSensitive: true,
    isAdult18Plus: false,
    allowComments: false,
    processingStatus: "READY",
    engagement: {
      likeCount: 5,
      commentCount: 0
    },
    ai: {
      tags: [],
      moderationLabels: ["pending_review"],
      embeddingRef: null
    },
    createdAt: "2026-05-04T00:10:00.000Z",
    updatedAt: "2026-05-04T00:10:00.000Z"
  }
];

const sortNewestFirst = (items) => {
  return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getAllAssets = ({ mediaType, tag, search, location } = {}) => {
  let result = [...assets];

  if (mediaType) {
    result = result.filter(
      (asset) => asset.mediaType.toLowerCase() === String(mediaType).toLowerCase()
    );
  }

  if (tag) {
    const cleanTag = String(tag).trim().replace(/^#/, "").toLowerCase();
    result = result.filter((asset) =>
      asset.hashtags.some((hashtag) => hashtag.replace(/^#/, "").toLowerCase() === cleanTag)
    );
  }

  if (location) {
    const cleanLocation = String(location).trim().toLowerCase();
    result = result.filter((asset) =>
      asset.locationName.toLowerCase().includes(cleanLocation)
    );
  }

  if (search) {
    const searchTerm = String(search).trim().toLowerCase();

    result = result.filter((asset) => {
      const searchableText = [
        asset.title,
        asset.caption,
        asset.description,
        asset.mediaType,
        asset.visibility,
        asset.locationName,
        ...asset.hashtags,
        ...asset.taggedUsers
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
    caption: validation.value.caption,
    description: validation.value.description,
    mediaType: validation.value.mediaType,
    mimeType: validation.value.mimeType,
    fileName: validation.value.fileName,
    blobUrl: validation.value.blobUrl,
    blobName: "",
    hashtags: validation.value.hashtags,
    tags: validation.value.hashtags,
    taggedUsers: validation.value.taggedUsers,
    locationName: validation.value.locationName,
    visibility: validation.value.visibility,
    isSensitive: validation.value.isSensitive,
    isAdult18Plus: validation.value.isAdult18Plus,
    allowComments: validation.value.allowComments,
    processingStatus: validation.value.blobUrl ? "READY" : "PENDING_UPLOAD",
    engagement: {
      likeCount: 0,
      commentCount: 0
    },
    ai: {
      tags: [],
      moderationLabels: ["not_checked"],
      embeddingRef: null
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };

  assets.push(asset);

  return asset;
};

export const createAssetFromUpload = async ({ file, payload }) => {
  const fileValidation = validateUploadedFile(file);

  if (!fileValidation.isValid) {
    const error = new Error("File validation failed.");
    error.statusCode = 400;
    error.details = fileValidation.errors;
    throw error;
  }

  const detectedMediaType = detectMediaType(file.mimetype);

  const metadataPayload = {
    ...payload,
    mediaType: payload.mediaType || detectedMediaType,
    mimeType: file.mimetype,
    fileName: file.originalname,
    blobUrl: ""
  };

  const validation = validateCreateAssetPayload(metadataPayload);

  if (!validation.isValid) {
    const error = new Error("Asset validation failed.");
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  const id = generateAssetId();
  const timestamp = nowIso();

  const uploadedBlob = await uploadFileToBlob({
    file,
    assetId: id,
    ownerId: validation.value.ownerId
  });

  const asset = {
    id,
    assetId: id,
    ownerId: validation.value.ownerId,
    title: validation.value.title,
    caption: validation.value.caption,
    description: validation.value.description,
    mediaType: validation.value.mediaType,
    mimeType: uploadedBlob.mimeType,
    fileName: uploadedBlob.fileName,
    blobUrl: uploadedBlob.blobUrl,
    blobName: uploadedBlob.blobName,
    sizeBytes: uploadedBlob.sizeBytes,
    hashtags: validation.value.hashtags,
    tags: validation.value.hashtags,
    taggedUsers: validation.value.taggedUsers,
    locationName: validation.value.locationName,
    visibility: validation.value.visibility,
    isSensitive: validation.value.isSensitive,
    isAdult18Plus: validation.value.isAdult18Plus,
    allowComments: validation.value.allowComments,
    processingStatus: "READY",
    engagement: {
      likeCount: 0,
      commentCount: 0
    },
    ai: {
      tags: [],
      moderationLabels: ["not_checked"],
      embeddingRef: null
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

  if (validation.value.hashtags) {
    asset.tags = validation.value.hashtags;
  }

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

  const sensitiveCount = assets.filter((asset) => asset.isSensitive).length;
  const adultCount = assets.filter((asset) => asset.isAdult18Plus).length;
  const premiumCount = assets.filter((asset) => asset.visibility === "CREATOR_PREMIUM").length;

  return {
    totalAssets,
    byMediaType,
    byVisibility,
    sensitiveCount,
    adultCount,
    premiumCount,
    latestAsset: sortNewestFirst(assets)[0] || null
  };
};
`);

writeFile("src/controllers/assetController.js", `
import {
  createAsset,
  createAssetFromUpload,
  deleteAsset,
  getAllAssets,
  getAssetById,
  getAssetStats,
  updateAsset
} from "../services/assetService.js";
import { getAllowedUploadSummary } from "../utils/fileValidation.js";

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
      search: req.query.search,
      location: req.query.location
    });

    return sendSuccess(res, 200, "HyMedia feed assets retrieved successfully.", assets, {
      count: assets.length,
      filters: {
        mediaType: req.query.mediaType || null,
        tag: req.query.tag || null,
        search: req.query.search || null,
        location: req.query.location || null
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
      const error = new Error("HyMedia asset not found.");
      error.statusCode = 404;
      throw error;
    }

    return sendSuccess(res, 200, "HyMedia asset retrieved successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const createNewAsset = (req, res, next) => {
  try {
    const asset = createAsset(req.body);

    return sendSuccess(res, 201, "HyMedia media post created successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const uploadNewAsset = async (req, res, next) => {
  try {
    const asset = await createAssetFromUpload({
      file: req.file,
      payload: req.body
    });

    return sendSuccess(res, 201, "HyMedia media file uploaded to Azure Blob Storage successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const updateExistingAsset = (req, res, next) => {
  try {
    const asset = updateAsset(req.params.assetId, req.body);

    if (!asset) {
      const error = new Error("HyMedia asset not found.");
      error.statusCode = 404;
      throw error;
    }

    return sendSuccess(res, 200, "HyMedia media post updated successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const deleteExistingAsset = (req, res, next) => {
  try {
    const asset = deleteAsset(req.params.assetId);

    if (!asset) {
      const error = new Error("HyMedia asset not found.");
      error.statusCode = 404;
      throw error;
    }

    return sendSuccess(res, 200, "HyMedia media post deleted successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const getStats = (req, res, next) => {
  try {
    const stats = getAssetStats();

    return sendSuccess(res, 200, "HyMedia dashboard statistics retrieved successfully.", stats);
  } catch (error) {
    next(error);
  }
};

export const getUploadRules = (req, res, next) => {
  try {
    return sendSuccess(res, 200, "HyMedia upload rules retrieved successfully.", getAllowedUploadSummary());
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
      "GET /api/v1/assets/upload-rules",
      "GET /api/v1/assets/:assetId",
      "POST /api/v1/assets",
      "POST /api/v1/assets/upload",
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

console.log("Step 5D Azure Blob Storage backend integration generated.");