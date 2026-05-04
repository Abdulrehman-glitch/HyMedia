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
