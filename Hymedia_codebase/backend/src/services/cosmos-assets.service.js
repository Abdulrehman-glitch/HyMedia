const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { getCosmosAssetsContainer } = require("../config/cosmosClient");
const { MODERATION_STATUS } = require("./moderation.service");
const { normalizeVisibilityInput, VISIBILITY } = require("../validators/assets.validators");

const publicWritableAssetFields = new Set([
  "title",
  "caption",
  "tags",
  "location",
  "visibility",
  "isSensitive",
  "isAdult18Plus"
]);

const systemWritableAssetFields = new Set([
  "moderationStatus",
  "moderationProvider",
  "moderationCheckedAt",
  "moderationScores",
  "moderationReasons",
  "requiresHumanReview",
  "moderationReviewedAt",
  "moderationReviewerNote",
  "removedAt",
  "reportCount",
  "isSensitive",
  "isAdult18Plus",
  "processingStatus",
  "deletedAt",
  "deletedBy",
  "restoredAt",
  "purgedAt"
]);

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
    type: "asset",
    title: payload.title || "Untitled HyMedia Asset",
    caption: payload.caption || "",
    mediaType: payload.mediaType || detectMediaType(payload.mimeType),
    mimeType: payload.mimeType || "",
    fileName: payload.fileName || "",
    blobName: payload.blobName || "",
    blobUrl: "",
    tags: normalizeTags(payload.tags),
    location: payload.location || "",
    visibility: normalizeVisibilityInput(payload.visibility || VISIBILITY.PUBLIC),
    isSensitive: Boolean(payload.isSensitive),
    isAdult18Plus: Boolean(payload.isAdult18Plus),
    processingStatus: payload.processingStatus || "READY",
    moderationStatus: payload.moderationStatus || MODERATION_STATUS.APPROVED,
    moderationProvider: payload.moderationProvider || "manual",
    moderationCheckedAt: payload.moderationCheckedAt || now,
    moderationScores: payload.moderationScores || {},
    moderationReasons: payload.moderationReasons || [],
    requiresHumanReview: Boolean(payload.requiresHumanReview),
    reportCount: Number(payload.reportCount || 0),
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
  const conditions = [
    "(NOT IS_DEFINED(c.type) OR c.type = @assetType)",
    "(NOT IS_DEFINED(c.deletedAt) OR IS_NULL(c.deletedAt))"
  ];
  const parameters = [{ name: "@assetType", value: "asset" }];

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
      value: normalizeVisibilityInput(filters.visibility).toLowerCase()
    });
  }

  if (filters.tag) {
    conditions.push("ARRAY_CONTAINS(c.tags, @tag)");
    parameters.push({
      name: "@tag",
      value: String(filters.tag).trim()
    });
  }

  query += ` WHERE ${conditions.join(" AND ")}`;

  query += " ORDER BY c.createdAt DESC";

  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  query += " OFFSET @offset LIMIT @limit";
  parameters.push({ name: "@offset", value: offset });
  parameters.push({ name: "@limit", value: limit });

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
  return updatePublicAsset(assetId, payload);
}

async function replaceAsset(assetId, payload, writableFields) {
  const existingAsset = await getAssetById(assetId);

  if (!existingAsset) {
    return null;
  }

  const allowedPayload = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (writableFields.has(key)) {
      allowedPayload[key] = value;
    }
  }

  if (allowedPayload.visibility !== undefined) {
    allowedPayload.visibility = normalizeVisibilityInput(allowedPayload.visibility);
  }

  const updatedAsset = {
    ...existingAsset,
    ...allowedPayload,
    id: existingAsset.id,
    assetId: existingAsset.assetId,
    ownerId: existingAsset.ownerId || "",
    ownerEmail: existingAsset.ownerEmail || "",
    blobName: existingAsset.blobName || "",
    blobUrl: "",
    fileName: existingAsset.fileName || "",
    mimeType: existingAsset.mimeType || "",
    mediaType: existingAsset.mediaType || "other",
    processingStatus: existingAsset.processingStatus || "READY",
    likeCount: Number(existingAsset.likeCount || 0),
    commentCount: Number(existingAsset.commentCount || 0),
    tags: allowedPayload.tags !== undefined ? normalizeTags(allowedPayload.tags) : existingAsset.tags,
    createdAt: existingAsset.createdAt,
    updatedAt: new Date().toISOString()
  };

  const container = getCosmosAssetsContainer();
  const { resource } = await container.item(assetId, assetId).replace(updatedAsset);

  return resource;
}

async function updatePublicAsset(assetId, payload) {
  return replaceAsset(assetId, payload, publicWritableAssetFields);
}

async function updateAssetSystemFields(assetId, payload) {
  return replaceAsset(assetId, payload, systemWritableAssetFields);
}

async function softDeleteAsset(assetId, userId) {
  return updateAssetSystemFields(assetId, {
    deletedAt: new Date().toISOString(),
    deletedBy: userId,
    processingStatus: "DELETED"
  });
}

async function restoreAsset(assetId) {
  const existingAsset = await getAssetById(assetId);

  if (!existingAsset) {
    return null;
  }

  const restoredAsset = {
    ...existingAsset,
    deletedAt: null,
    deletedBy: "",
    restoredAt: new Date().toISOString(),
    processingStatus: existingAsset.blobName ? "READY" : existingAsset.processingStatus || "READY",
    updatedAt: new Date().toISOString()
  };

  const container = getCosmosAssetsContainer();
  const { resource } = await container.item(assetId, assetId).replace(restoredAsset);

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

async function getDeletedAssetsByOwner(ownerId, filters = {}) {
  const container = getCosmosAssetsContainer();
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  const { resources } = await container.items
    .query({
      query: `
        SELECT * FROM c
        WHERE (NOT IS_DEFINED(c.type) OR c.type = @assetType)
          AND c.ownerId = @ownerId
          AND IS_DEFINED(c.deletedAt)
          AND NOT IS_NULL(c.deletedAt)
        ORDER BY c.deletedAt DESC
        OFFSET @offset LIMIT @limit
      `,
      parameters: [
        { name: "@assetType", value: "asset" },
        { name: "@ownerId", value: ownerId },
        { name: "@offset", value: offset },
        { name: "@limit", value: limit }
      ]
    })
    .fetchAll();

  return resources;
}

async function getAssetsByOwner(ownerId, filters = {}) {
  const container = getCosmosAssetsContainer();
  const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  const { resources } = await container.items
    .query({
      query: `
        SELECT * FROM c
        WHERE (NOT IS_DEFINED(c.type) OR c.type = @assetType)
          AND c.ownerId = @ownerId
        ORDER BY c.createdAt DESC
        OFFSET @offset LIMIT @limit
      `,
      parameters: [
        { name: "@assetType", value: "asset" },
        { name: "@ownerId", value: ownerId },
        { name: "@offset", value: offset },
        { name: "@limit", value: limit }
      ]
    })
    .fetchAll();

  return resources;
}

function hashShareToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createShareSecret() {
  return crypto.randomBytes(32).toString("base64url");
}

function sanitizeShareLink(shareLink, includeToken = false) {
  if (!shareLink) return null;

  const sanitized = {
    shareId: shareLink.shareId,
    assetId: shareLink.assetId,
    ownerId: shareLink.ownerId,
    permission: shareLink.permission,
    expiresAt: shareLink.expiresAt,
    revokedAt: shareLink.revokedAt || null,
    createdAt: shareLink.createdAt,
    updatedAt: shareLink.updatedAt,
    viewCount: Number(shareLink.viewCount || 0)
  };

  if (includeToken) {
    sanitized.token = shareLink.token;
  }

  return sanitized;
}

async function createShareLink(asset, payload = {}) {
  const container = getCosmosAssetsContainer();
  const now = new Date().toISOString();
  const shareId = uuidv4();
  const token = createShareSecret();
  const expiresInHours = Math.min(Math.max(Number(payload.expiresInHours) || 24, 1), 24 * 30);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  const shareLink = {
    id: shareId,
    shareId,
    type: "share-link",
    assetId: asset.assetId,
    ownerId: asset.ownerId || "",
    tokenHash: hashShareToken(token),
    permission: payload.permission || "view",
    expiresAt,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
    viewCount: 0,
    token
  };

  const document = { ...shareLink };
  delete document.token;
  await container.items.create(document);

  return sanitizeShareLink(shareLink, true);
}

async function listShareLinks(assetId) {
  const container = getCosmosAssetsContainer();
  const { resources } = await container.items
    .query({
      query: `
        SELECT * FROM c
        WHERE c.type = @type AND c.assetId = @assetId
        ORDER BY c.createdAt DESC
      `,
      parameters: [
        { name: "@type", value: "share-link" },
        { name: "@assetId", value: assetId }
      ]
    })
    .fetchAll();

  return resources.map((shareLink) => sanitizeShareLink(shareLink));
}

async function revokeShareLink(shareId, ownerId) {
  const container = getCosmosAssetsContainer();

  try {
    const { resource } = await container.item(shareId, shareId).read();
    if (!resource || resource.ownerId !== ownerId) {
      return null;
    }

    const now = new Date().toISOString();
    const revoked = {
      ...resource,
      revokedAt: now,
      updatedAt: now
    };

    const response = await container.item(shareId, shareId).replace(revoked);
    return sanitizeShareLink(response.resource);
  } catch (error) {
    if (error.code === 404) return null;
    throw error;
  }
}

async function getActiveShareLinkByToken(token) {
  const container = getCosmosAssetsContainer();
  const tokenHash = hashShareToken(token);

  const { resources } = await container.items
    .query({
      query: `
        SELECT * FROM c
        WHERE c.type = @type AND c.tokenHash = @tokenHash
      `,
      parameters: [
        { name: "@type", value: "share-link" },
        { name: "@tokenHash", value: tokenHash }
      ]
    })
    .fetchAll();

  const shareLink = resources[0];
  if (!shareLink || shareLink.revokedAt || new Date(shareLink.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  const updated = {
    ...shareLink,
    viewCount: Number(shareLink.viewCount || 0) + 1,
    lastViewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await container.item(shareLink.shareId, shareLink.shareId).replace(updated);
  return sanitizeShareLink(updated);
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

async function createAssetReport(asset, reporter, payload) {
  const container = getCosmosAssetsContainer();
  const now = new Date().toISOString();
  const reportId = uuidv4();

  const report = {
    id: reportId,
    reportId,
    type: "asset-report",
    assetId: asset.assetId,
    ownerId: asset.ownerId || "",
    reporterId: reporter.userId,
    reporterEmail: reporter.email,
    reason: payload.reason,
    note: payload.note || "",
    status: "open",
    createdAt: now,
    updatedAt: now
  };

  await container.items.create(report);

  await updateAssetSystemFields(asset.assetId, {
    reportCount: Number(asset.reportCount || 0) + 1,
    requiresHumanReview: true,
    moderationStatus: asset.moderationStatus === MODERATION_STATUS.REMOVED
      ? MODERATION_STATUS.REMOVED
      : MODERATION_STATUS.QUARANTINED
  });

  return report;
}

async function getModerationQueue(filters = {}) {
  const container = getCosmosAssetsContainer();
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  const { resources } = await container.items
    .query({
      query: `
        SELECT * FROM c
        WHERE (NOT IS_DEFINED(c.type) OR c.type = @assetType)
          AND (
            c.requiresHumanReview = true
            OR c.moderationStatus = @sensitive
            OR c.moderationStatus = @quarantined
            OR c.reportCount > 0
          )
        ORDER BY c.updatedAt DESC
        OFFSET @offset LIMIT @limit
      `,
      parameters: [
        { name: "@assetType", value: "asset" },
        { name: "@sensitive", value: MODERATION_STATUS.SENSITIVE },
        { name: "@quarantined", value: MODERATION_STATUS.QUARANTINED },
        { name: "@offset", value: offset },
        { name: "@limit", value: limit }
      ]
    })
    .fetchAll();

  return resources;
}

module.exports = {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  updatePublicAsset,
  updateAssetSystemFields,
  softDeleteAsset,
  restoreAsset,
  deleteAsset,
  getDeletedAssetsByOwner,
  getAssetsByOwner,
  getAssetStats,
  detectMediaType,
  createAssetReport,
  getModerationQueue,
  createShareLink,
  listShareLinks,
  revokeShareLink,
  getActiveShareLinkByToken,
  sanitizeShareLink
};
