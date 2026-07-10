const { v4: uuidv4 } = require("uuid");
const { getCosmosAssetsContainer } = require("../config/cosmosClient");

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function detectMediaType(mimeType = "") {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "other";
}

async function createAsset(payload) {
  const container = getCosmosAssetsContainer();
  const now = new Date().toISOString();
  const assetId = payload.assetId || uuidv4();

  const asset = {
    id: assetId,
    assetId,
    title: payload.title || "Untitled HyMedia Asset",
    caption: payload.caption || "",
    mediaType: payload.mediaType || detectMediaType(payload.mimeType),
    mimeType: payload.mimeType || "",
    fileName: payload.fileName || "",
    blobName: payload.blobName || "",
    blobUrl: payload.blobUrl || "",
    tags: normalizeTags(payload.tags),
    location: payload.location || "",
    visibility: payload.visibility || "PUBLIC",
    isSensitive: Boolean(payload.isSensitive),
    isAdult18Plus: Boolean(payload.isAdult18Plus),
    processingStatus: payload.processingStatus || "READY",
    likeCount: Number(payload.likeCount || 0),
    commentCount: Number(payload.commentCount || 0),
    ownerId: payload.ownerId || "",
    ownerEmail: payload.ownerEmail || "",
    createdAt: now,
    updatedAt: now,
    cloudProvider: "Microsoft Azure",
    storageService: "Azure Blob Storage",
    metadataService: "Azure Cosmos DB for NoSQL"
  };

  const response = await container.items.create(asset);
  return response.resource;
}

async function getAllAssets(filters = {}) {
  const container = getCosmosAssetsContainer();

  let query = "SELECT * FROM c";
  const conditions = [];
  const parameters = [];

  if (filters.mediaType) {
    conditions.push("LOWER(c.mediaType) = @mediaType");
    parameters.push({
      name: "@mediaType",
      value: String(filters.mediaType).toLowerCase()
    });
  }

  if (filters.visibility) {
    conditions.push("LOWER(c.visibility) = @visibility");
    parameters.push({
      name: "@visibility",
      value: String(filters.visibility).toLowerCase()
    });
  }

  if (filters.tag) {
    conditions.push("ARRAY_CONTAINS(c.tags, @tag)");
    parameters.push({
      name: "@tag",
      value: String(filters.tag).trim()
    });
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += " ORDER BY c.createdAt DESC";

  const { resources } = await container.items
    .query({
      query,
      parameters
    })
    .fetchAll();

  return resources;
}

async function getAssetById(assetId) {
  const container = getCosmosAssetsContainer();

  try {
    const { resource } = await container.item(assetId, assetId).read();
    return resource || null;
  } catch (error) {
    if (error.code === 404) {
      return null;
    }

    throw error;
  }
}

async function updateAsset(assetId, payload) {
  const existingAsset = await getAssetById(assetId);

  if (!existingAsset) {
    return null;
  }

  const updatedAsset = {
    ...existingAsset,
    ...payload,
    id: existingAsset.id,
    assetId: existingAsset.assetId,
    tags: payload.tags !== undefined ? normalizeTags(payload.tags) : existingAsset.tags,
    createdAt: existingAsset.createdAt,
    updatedAt: new Date().toISOString()
  };

  const container = getCosmosAssetsContainer();
  const { resource } = await container.item(assetId, assetId).replace(updatedAsset);

  return resource;
}

async function deleteAsset(assetId) {
  const existingAsset = await getAssetById(assetId);

  if (!existingAsset) {
    return null;
  }

  const container = getCosmosAssetsContainer();
  await container.item(assetId, assetId).delete();

  return existingAsset;
}

async function getAssetStats() {
  const assets = await getAllAssets();

  return {
    totalAssets: assets.length,
    imageAssets: assets.filter((asset) => asset.mediaType === "image").length,
    videoAssets: assets.filter((asset) => asset.mediaType === "video").length,
    audioAssets: assets.filter((asset) => asset.mediaType === "audio").length,
    publicAssets: assets.filter((asset) => asset.visibility === "PUBLIC").length,
    privateAssets: assets.filter((asset) => asset.visibility !== "PUBLIC").length,
    sensitiveAssets: assets.filter((asset) => asset.isSensitive).length,
    adult18PlusAssets: assets.filter((asset) => asset.isAdult18Plus).length
  };
}

module.exports = {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  getAssetStats,
  detectMediaType
};
