const fs = require("fs");

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content.trimStart(), "utf8");
  console.log("Updated " + filePath);
}

console.log("Updating backend to align with submitted HyMedia CW1 design...");

writeFile("src/utils/assetValidation.js", `
const allowedVisibilityValues = [
  "PUBLIC",
  "PRIVATE_SELECTED",
  "UNLISTED_LINK",
  "CREATOR_PREMIUM"
];

const allowedMediaTypes = ["image", "video", "audio", "gif"];

const normaliseList = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normaliseTags = (tags) => {
  return normaliseList(tags).map((tag) => {
    const cleaned = tag.replace(/^#/, "").trim().toLowerCase();
    return cleaned ? "#" + cleaned : "";
  }).filter(Boolean);
};

const normaliseTaggedUsers = (taggedUsers) => {
  return normaliseList(taggedUsers).map((user) => {
    const cleaned = user.replace(/^@/, "").trim().toLowerCase();
    return cleaned ? "@" + cleaned : "";
  }).filter(Boolean);
};

export const validateCreateAssetPayload = (payload) => {
  const errors = [];

  const title = payload.title ? String(payload.title).trim() : "";
  const caption = payload.caption ? String(payload.caption).trim() : "";
  const description = payload.description ? String(payload.description).trim() : "";
  const mediaType = payload.mediaType ? String(payload.mediaType).trim().toLowerCase() : "";
  const visibility = payload.visibility ? String(payload.visibility).trim().toUpperCase() : "PUBLIC";
  const ownerId = payload.ownerId ? String(payload.ownerId).trim() : "demo_user";
  const blobUrl = payload.blobUrl ? String(payload.blobUrl).trim() : "";
  const mimeType = payload.mimeType ? String(payload.mimeType).trim() : "";
  const fileName = payload.fileName ? String(payload.fileName).trim() : "";
  const locationName = payload.locationName ? String(payload.locationName).trim() : "";

  if (!title) {
    errors.push("Title is required.");
  }

  if (title.length > 120) {
    errors.push("Title must not exceed 120 characters.");
  }

  if (caption.length > 280) {
    errors.push("Caption must not exceed 280 characters.");
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
    errors.push("Visibility must be one of: PUBLIC, PRIVATE_SELECTED, UNLISTED_LINK, CREATOR_PREMIUM.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      title,
      caption,
      description,
      mediaType,
      visibility,
      ownerId,
      blobUrl,
      mimeType,
      fileName,
      locationName,
      hashtags: normaliseTags(payload.hashtags || payload.tags),
      taggedUsers: normaliseTaggedUsers(payload.taggedUsers),
      isSensitive: Boolean(payload.isSensitive),
      isAdult18Plus: Boolean(payload.isAdult18Plus),
      allowComments: payload.allowComments === undefined ? true : Boolean(payload.allowComments)
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

  if (payload.caption !== undefined) {
    const caption = String(payload.caption).trim();

    if (caption.length > 280) {
      errors.push("Caption must not exceed 280 characters.");
    }

    update.caption = caption;
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
      errors.push("Visibility must be one of: PUBLIC, PRIVATE_SELECTED, UNLISTED_LINK, CREATOR_PREMIUM.");
    }

    update.visibility = visibility;
  }

  if (payload.hashtags !== undefined || payload.tags !== undefined) {
    update.hashtags = normaliseTags(payload.hashtags || payload.tags);
    update.tags = update.hashtags;
  }

  if (payload.taggedUsers !== undefined) {
    update.taggedUsers = normaliseTaggedUsers(payload.taggedUsers);
  }

  if (payload.locationName !== undefined) {
    update.locationName = String(payload.locationName).trim();
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

  if (payload.allowComments !== undefined) {
    update.allowComments = Boolean(payload.allowComments);
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
`);

console.log("Backend HyMedia alignment complete.");