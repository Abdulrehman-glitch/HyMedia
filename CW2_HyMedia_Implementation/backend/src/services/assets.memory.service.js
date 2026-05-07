const { v4: uuidv4 } = require("uuid");

const assets = [
  {
    assetId: "sample-asset-001",
    title: "London Street Photography",
    caption: "A sample image metadata record for HyMedia testing.",
    mediaType: "image",
    mimeType: "image/jpeg",
    fileName: "sample-london.jpg",
    blobUrl: "https://example.com/sample-london.jpg",
    tags: ["london", "street", "photography"],
    location: "London",
    visibility: "PUBLIC",
    isSensitive: false,
    isAdult18Plus: false,
    processingStatus: "READY",
    likeCount: 12,
    commentCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function getAllAssets(filters = {}) {
  let result = [...assets];

  if (filters.mediaType) {
    result = result.filter(
      (asset) => asset.mediaType.toLowerCase() === filters.mediaType.toLowerCase()
    );
  }

  if (filters.tag) {
    result = result.filter((asset) =>
      asset.tags.some((tag) => tag.toLowerCase() === filters.tag.toLowerCase())
    );
  }

  if (filters.visibility) {
    result = result.filter(
      (asset) => asset.visibility.toLowerCase() === filters.visibility.toLowerCase()
    );
  }

  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getAssetById(assetId) {
  return assets.find((asset) => asset.assetId === assetId);
}

function createAsset(payload) {
  const now = new Date().toISOString();

  const newAsset = {
    assetId: uuidv4(),
    title: payload.title || "Untitled HyMedia Asset",
    caption: payload.caption || "",
    mediaType: payload.mediaType || "image",
    mimeType: payload.mimeType || "",
    fileName: payload.fileName || "",
    blobUrl: payload.blobUrl || "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    location: payload.location || "",
    visibility: payload.visibility || "PUBLIC",
    isSensitive: Boolean(payload.isSensitive),
    isAdult18Plus: Boolean(payload.isAdult18Plus),
    processingStatus: payload.processingStatus || "READY",
    likeCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now
  };

  assets.push(newAsset);
  return newAsset;
}

function updateAsset(assetId, payload) {
  const index = assets.findIndex((asset) => asset.assetId === assetId);

  if (index === -1) {
    return null;
  }

  assets[index] = {
    ...assets[index],
    ...payload,
    assetId: assets[index].assetId,
    createdAt: assets[index].createdAt,
    updatedAt: new Date().toISOString()
  };

  return assets[index];
}

function deleteAsset(assetId) {
  const index = assets.findIndex((asset) => asset.assetId === assetId);

  if (index === -1) {
    return null;
  }

  const deletedAsset = assets[index];
  assets.splice(index, 1);

  return deletedAsset;
}

function getAssetStats() {
  const totalAssets = assets.length;
  const imageAssets = assets.filter((asset) => asset.mediaType === "image").length;
  const videoAssets = assets.filter((asset) => asset.mediaType === "video").length;
  const audioAssets = assets.filter((asset) => asset.mediaType === "audio").length;
  const publicAssets = assets.filter((asset) => asset.visibility === "PUBLIC").length;
  const privateAssets = assets.filter((asset) => asset.visibility !== "PUBLIC").length;
  const sensitiveAssets = assets.filter((asset) => asset.isSensitive).length;

  return {
    totalAssets,
    imageAssets,
    videoAssets,
    audioAssets,
    publicAssets,
    privateAssets,
    sensitiveAssets
  };
}

module.exports = {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetStats
};