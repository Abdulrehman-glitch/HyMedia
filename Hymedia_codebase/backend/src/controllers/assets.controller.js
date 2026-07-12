const {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  updateAssetSystemFields,
  deleteAsset,
  softDeleteAsset,
  restoreAsset,
  getDeletedAssetsByOwner,
  detectMediaType,
  createAssetReport,
  getModerationQueue,
  createShareLink,
  listShareLinks,
  revokeShareLink,
  getActiveShareLinkByToken
} = require("../services/cosmos-assets.service");

const fs = require("fs");
const path = require("path");
const {
  uploadFileToAzureBlob,
  getBlobProperties,
  downloadBlobRange,
  deleteBlobIfExists
} = require("../services/blob.service");
const { isAdmin, isModerator } = require("../middleware/auth.middleware");
const { visibilityInputSchema, normalizeVisibilityInput, VISIBILITY } = require("../validators/assets.validators");
const { auditFromRequest } = require("../services/audit.service");
const {
  MODERATION_STATUS,
  moderateAssetCandidate,
  applyModeratorDecision
} = require("../services/moderation.service");

const allowedUploadMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/vnd.wave",
  "audio/ogg"
]);

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".mp4",
  ".mov",
  ".webm",
  ".mp3",
  ".wav",
  ".ogg"
]);

function normalizeBoolean(value) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function normalizeVisibility(value) {
  const parsed = visibilityInputSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function assetVisibility(asset) {
  return normalizeVisibilityInput(asset?.visibility || VISIBILITY.PUBLIC);
}

function canManageAsset(user, asset) {
  if (!user || !asset) return false;
  if (isAdmin(user)) return true;
  return Boolean(asset.ownerId && asset.ownerId === user.userId);
}

function isDeleted(asset) {
  return Boolean(asset?.deletedAt);
}

function canViewAsset(user, asset) {
  if (!asset) return false;
  if (isDeleted(asset)) return canManageAsset(user, asset);
  if (asset.moderationStatus === MODERATION_STATUS.REMOVED) return isModerator(user);
  if (asset.moderationStatus === MODERATION_STATUS.QUARANTINED) {
    return canManageAsset(user, asset) || isModerator(user);
  }
  const visibility = assetVisibility(asset);
  if (visibility === VISIBILITY.PUBLIC || visibility === VISIBILITY.UNLISTED) return true;
  return canManageAsset(user, asset);
}

function visibleToUser(user, asset) {
  if (isDeleted(asset)) return false;
  if (asset.moderationStatus === MODERATION_STATUS.REMOVED) return isModerator(user);
  if (asset.moderationStatus === MODERATION_STATUS.QUARANTINED && !canManageAsset(user, asset)) {
    return isModerator(user);
  }
  if (canManageAsset(user, asset)) return true;
  return assetVisibility(asset) === VISIBILITY.PUBLIC;
}

function canStreamAsset(user, asset) {
  if (!canViewAsset(user, asset)) return false;
  if ([MODERATION_STATUS.QUARANTINED, MODERATION_STATUS.REMOVED].includes(asset.moderationStatus)) {
    return isModerator(user);
  }
  return true;
}

function buildStats(assets) {
  return {
    totalAssets: assets.length,
    imageAssets: assets.filter((asset) => asset.mediaType === "image").length,
    videoAssets: assets.filter((asset) => asset.mediaType === "video").length,
    audioAssets: assets.filter((asset) => asset.mediaType === "audio").length,
    publicAssets: assets.filter((asset) => assetVisibility(asset) === VISIBILITY.PUBLIC).length,
    privateAssets: assets.filter((asset) => assetVisibility(asset) !== VISIBILITY.PUBLIC).length,
    sensitiveAssets: assets.filter((asset) => asset.isSensitive).length,
    adult18PlusAssets: assets.filter((asset) => asset.isAdult18Plus).length,
    quarantinedAssets: assets.filter((asset) => asset.moderationStatus === MODERATION_STATUS.QUARANTINED).length,
    reportedAssets: assets.filter((asset) => Number(asset.reportCount || 0) > 0).length
  };
}

function cleanupUploadedFile(file) {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
}

async function verifyUploadedFile(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();

  if (!allowedExtensions.has(extension)) {
    const error = new Error("Unsupported file extension.");
    error.status = 400;
    throw error;
  }

  const { fileTypeFromFile } = await import("file-type");
  const detected = await fileTypeFromFile(file.path);

  if (!detected || !allowedUploadMimeTypes.has(detected.mime)) {
    const error = new Error("Uploaded file content does not match an allowed media type.");
    error.status = 400;
    throw error;
  }

  const knownMimeAliases = (
    (detected.mime === "audio/vnd.wave" && file.mimetype === "audio/wav") ||
    (detected.mime === "image/jpeg" && file.mimetype === "image/jpg")
  );

  if (detected.mime !== file.mimetype && !knownMimeAliases) {
    const error = new Error("Uploaded file MIME type does not match its content.");
    error.status = 400;
    throw error;
  }

  file.detectedMimeType = detected.mime;
}

async function listAssets(req, res, next) {
  try {
    const assets = await getAllAssets({
      mediaType: req.query.mediaType,
      tag: req.query.tag,
      visibility: req.query.visibility ? normalizeVisibility(req.query.visibility) : undefined,
      limit: req.query.limit,
      offset: req.query.offset
    });
    const visibleAssets = assets.filter((asset) => visibleToUser(req.user, asset));

    res.status(200).json({
      success: true,
      count: visibleAssets.length,
      pagination: {
        limit: Math.min(Math.max(Number(req.query.limit) || 50, 1), 100),
        offset: Math.max(Number(req.query.offset) || 0, 0)
      },
      data: visibleAssets
    });
  } catch (error) {
    next(error);
  }
}

async function getSingleAsset(req, res, next) {
  try {
    const { assetId } = req.params;
    const asset = await getAssetById(assetId);

    if (!asset || (isDeleted(asset) && !canManageAsset(req.user, asset))) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    if (!canViewAsset(req.user, asset)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this asset."
      });
    }

    res.status(200).json({
      success: true,
      data: asset
    });
  } catch (error) {
    next(error);
  }
}

async function createNewAsset(req, res, next) {
  try {
    const moderation = moderateAssetCandidate(req.body);
    const asset = await createAsset({
      ...req.body,
      ...moderation,
      isSensitive: moderation.moderationStatus === MODERATION_STATUS.SENSITIVE || req.body.isSensitive,
      ownerId: req.user?.userId,
      ownerEmail: req.user?.email
    });

    await auditFromRequest(req, {
      action: "asset.metadata.create",
      targetType: "asset",
      targetId: asset.assetId,
      metadata: { moderationStatus: asset.moderationStatus }
    });

    res.status(201).json({
      success: true,
      message: "HyMedia asset metadata created successfully in Azure Cosmos DB.",
      data: asset
    });
  } catch (error) {
    next(error);
  }
}

async function uploadAsset(req, res, next) {
  let uploadedFile;
  let uploadedBlob;
  let metadataSaved = false;

  try {
    uploadedFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: "No media file uploaded. Please attach a file using form-data."
      });
    }

    await verifyUploadedFile(uploadedFile);

    const visibility = normalizeVisibility(req.body.visibility);

    if (!visibility) {
      return res.status(400).json({
        success: false,
        message: "Invalid visibility value."
      });
    }

    uploadedBlob = await uploadFileToAzureBlob(uploadedFile);

    const moderation = moderateAssetCandidate({
      ...req.body,
      mimeType: uploadedBlob.mimeType,
      isSensitive: normalizeBoolean(req.body.isSensitive),
      isAdult18Plus: normalizeBoolean(req.body.isAdult18Plus)
    });

    const asset = await createAsset({
      title: req.body.title || uploadedBlob.originalName,
      caption: req.body.caption || "",
      mediaType: detectMediaType(uploadedBlob.mimeType),
      mimeType: uploadedBlob.mimeType,
      fileName: uploadedBlob.originalName,
      blobName: uploadedBlob.blobName,
      blobUrl: "",
      tags: req.body.tags || [],
      location: req.body.location || "",
      visibility,
      isSensitive: moderation.moderationStatus === MODERATION_STATUS.SENSITIVE || normalizeBoolean(req.body.isSensitive),
      isAdult18Plus: normalizeBoolean(req.body.isAdult18Plus),
      processingStatus: "READY",
      ...moderation,
      ownerId: req.user?.userId,
      ownerEmail: req.user?.email
    });
    metadataSaved = true;

    await auditFromRequest(req, {
      action: "asset.upload",
      targetType: "asset",
      targetId: asset.assetId,
      metadata: {
        blobName: asset.blobName,
        moderationStatus: asset.moderationStatus,
        mimeType: asset.mimeType,
        size: uploadedBlob.size
      }
    });

    res.status(201).json({
      success: true,
      message: asset.moderationStatus === MODERATION_STATUS.QUARANTINED
        ? "Media uploaded and quarantined for moderation review."
        : "HyMedia media file uploaded to Azure Blob Storage and metadata saved in Cosmos DB.",
      file: {
        blobName: uploadedBlob.blobName,
        originalName: uploadedBlob.originalName,
        mimeType: uploadedBlob.mimeType,
        size: uploadedBlob.size,
        extension: uploadedBlob.extension
      },
      data: asset
    });
  } catch (error) {
    cleanupUploadedFile(uploadedFile);
    if (uploadedBlob?.blobName && !metadataSaved) {
      try {
        await deleteBlobIfExists(uploadedBlob.blobName);
      } catch (deleteError) {
        console.warn(JSON.stringify({
          level: "warn",
          requestId: req.requestId,
          message: "Failed to clean orphaned blob after metadata failure.",
          blobName: uploadedBlob.blobName,
          error: deleteError.message
        }));
      }
    }
    next(error);
  }
}

async function streamAssetMedia(req, res, next) {
  try {
    const { assetId } = req.params;
    const asset = await getAssetById(assetId);

    if (!asset || !asset.blobName || isDeleted(asset)) {
      return res.status(404).json({
        success: false,
        message: "Asset media not found."
      });
    }

    if (!canStreamAsset(req.user, asset)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this media, or it is awaiting moderation."
      });
    }

    const properties = await getBlobProperties(asset.blobName);
    const fileSize = Number(properties.contentLength || 0);
    const contentType = asset.mimeType || properties.contentType || "application/octet-stream";
    const range = req.headers.range;

    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=300");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;

      if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize || end >= fileSize) {
        res.setHeader("Content-Range", `bytes */${fileSize}`);
        return res.status(416).end();
      }

      const chunkSize = end - start + 1;
      const downloadResponse = await downloadBlobRange(asset.blobName, start, chunkSize);

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", chunkSize);

      return downloadResponse.readableStreamBody.pipe(res);
    }

    const downloadResponse = await downloadBlobRange(asset.blobName, 0, fileSize);

    res.status(200);
    res.setHeader("Content-Length", fileSize);

    return downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    next(error);
  }
}

async function updateExistingAsset(req, res, next) {
  try {
    const { assetId } = req.params;
    const existingAsset = await getAssetById(assetId);

    if (!existingAsset || isDeleted(existingAsset)) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    if (!canManageAsset(req.user, existingAsset)) {
      return res.status(403).json({
        success: false,
        message: "Only the asset owner or an administrator can update this asset."
      });
    }

    const moderation = moderateAssetCandidate({
      ...existingAsset,
      ...req.body
    });

    await updateAsset(assetId, req.body);
    const updatedAsset = await updateAssetSystemFields(assetId, {
      ...moderation,
      isSensitive: moderation.moderationStatus === MODERATION_STATUS.SENSITIVE || req.body.isSensitive
    });

    await auditFromRequest(req, {
      action: "asset.update",
      targetType: "asset",
      targetId: assetId,
      metadata: { moderationStatus: updatedAsset.moderationStatus }
    });

    res.status(200).json({
      success: true,
      message: "HyMedia asset updated successfully in Cosmos DB.",
      data: updatedAsset
    });
  } catch (error) {
    next(error);
  }
}

async function deleteExistingAsset(req, res, next) {
  try {
    const { assetId } = req.params;
    const existingAsset = await getAssetById(assetId);

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    if (!canManageAsset(req.user, existingAsset)) {
      return res.status(403).json({
        success: false,
        message: "Only the asset owner or an administrator can delete this asset."
      });
    }

    const deletedAsset = await softDeleteAsset(assetId, req.user.userId);

    await auditFromRequest(req, {
      action: "asset.delete",
      targetType: "asset",
      targetId: assetId,
      metadata: { blobName: existingAsset.blobName || "" }
    });

    res.status(200).json({
      success: true,
      message: "HyMedia asset moved to recycle bin.",
      data: deletedAsset
    });
  } catch (error) {
    next(error);
  }
}

async function restoreDeletedAsset(req, res, next) {
  try {
    const { assetId } = req.params;
    const existingAsset = await getAssetById(assetId);

    if (!existingAsset || !isDeleted(existingAsset)) {
      return res.status(404).json({
        success: false,
        message: "Deleted asset not found."
      });
    }

    if (!canManageAsset(req.user, existingAsset)) {
      return res.status(403).json({
        success: false,
        message: "Only the asset owner or an administrator can restore this asset."
      });
    }

    const restoredAsset = await restoreAsset(assetId);

    await auditFromRequest(req, {
      action: "asset.restore",
      targetType: "asset",
      targetId: assetId
    });

    return res.status(200).json({
      success: true,
      message: "Asset restored.",
      data: restoredAsset
    });
  } catch (error) {
    next(error);
  }
}

async function purgeDeletedAsset(req, res, next) {
  try {
    const { assetId } = req.params;
    const existingAsset = await getAssetById(assetId);

    if (!existingAsset || !isDeleted(existingAsset)) {
      return res.status(404).json({
        success: false,
        message: "Deleted asset not found."
      });
    }

    if (!canManageAsset(req.user, existingAsset)) {
      return res.status(403).json({
        success: false,
        message: "Only the asset owner or an administrator can permanently delete this asset."
      });
    }

    if (existingAsset.blobName) {
      await deleteBlobIfExists(existingAsset.blobName);
    }

    const deletedAsset = await deleteAsset(assetId);

    await auditFromRequest(req, {
      action: "asset.purge",
      targetType: "asset",
      targetId: assetId,
      metadata: { blobName: existingAsset.blobName || "" }
    });

    return res.status(200).json({
      success: true,
      message: "Asset permanently deleted.",
      data: deletedAsset
    });
  } catch (error) {
    next(error);
  }
}

async function recycleBin(req, res, next) {
  try {
    const assets = await getDeletedAssetsByOwner(req.user.userId, {
      limit: req.query.limit,
      offset: req.query.offset
    });

    return res.status(200).json({
      success: true,
      count: assets.length,
      data: assets
    });
  } catch (error) {
    next(error);
  }
}

async function createAssetShareLink(req, res, next) {
  try {
    const { assetId } = req.params;
    const asset = await getAssetById(assetId);

    if (!asset || isDeleted(asset)) {
      return res.status(404).json({
        success: false,
        message: "Asset not found."
      });
    }

    if (!canManageAsset(req.user, asset)) {
      return res.status(403).json({
        success: false,
        message: "Only the asset owner or an administrator can create share links."
      });
    }

    const shareLink = await createShareLink(asset, req.body);
    const shareUrl = `${req.protocol}://${req.get("host")}/api/v1/assets/share/${shareLink.token}/media`;

    await auditFromRequest(req, {
      action: "asset.share.create",
      targetType: "asset",
      targetId: assetId,
      metadata: { shareId: shareLink.shareId, expiresAt: shareLink.expiresAt }
    });

    return res.status(201).json({
      success: true,
      message: "Share link created.",
      data: {
        ...shareLink,
        shareUrl
      }
    });
  } catch (error) {
    next(error);
  }
}

async function listAssetShareLinks(req, res, next) {
  try {
    const { assetId } = req.params;
    const asset = await getAssetById(assetId);

    if (!asset || isDeleted(asset)) {
      return res.status(404).json({
        success: false,
        message: "Asset not found."
      });
    }

    if (!canManageAsset(req.user, asset)) {
      return res.status(403).json({
        success: false,
        message: "Only the asset owner or an administrator can list share links."
      });
    }

    const shareLinks = await listShareLinks(assetId);

    return res.status(200).json({
      success: true,
      count: shareLinks.length,
      data: shareLinks
    });
  } catch (error) {
    next(error);
  }
}

async function revokeAssetShareLink(req, res, next) {
  try {
    const { shareId } = req.params;
    const revoked = await revokeShareLink(shareId, req.user.userId);

    if (!revoked) {
      return res.status(404).json({
        success: false,
        message: "Share link not found."
      });
    }

    await auditFromRequest(req, {
      action: "asset.share.revoke",
      targetType: "share-link",
      targetId: shareId
    });

    return res.status(200).json({
      success: true,
      message: "Share link revoked.",
      data: revoked
    });
  } catch (error) {
    next(error);
  }
}

async function streamSharedAssetMedia(req, res, next) {
  try {
    const shareLink = await getActiveShareLinkByToken(req.params.token);

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        message: "Share link not found or expired."
      });
    }

    const asset = await getAssetById(shareLink.assetId);

    if (!asset || !asset.blobName || isDeleted(asset)) {
      return res.status(404).json({
        success: false,
        message: "Shared media not found."
      });
    }

    if ([MODERATION_STATUS.QUARANTINED, MODERATION_STATUS.REMOVED].includes(asset.moderationStatus)) {
      return res.status(403).json({
        success: false,
        message: "Shared media is unavailable while under moderation."
      });
    }

    req.params.assetId = asset.assetId;
    req.user = { userId: asset.ownerId, role: "share-link" };
    return streamAssetMedia(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function reportAsset(req, res, next) {
  try {
    const { assetId } = req.params;
    const asset = await getAssetById(assetId);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    if (!canViewAsset(req.user, asset)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to report this asset."
      });
    }

    const report = await createAssetReport(asset, req.user, req.body);

    await auditFromRequest(req, {
      action: "asset.report",
      targetType: "asset",
      targetId: assetId,
      metadata: { reason: report.reason, reportId: report.reportId }
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted for moderation review.",
      data: report
    });
  } catch (error) {
    next(error);
  }
}

async function moderationQueue(req, res, next) {
  try {
    const assets = await getModerationQueue({
      limit: req.query.limit,
      offset: req.query.offset
    });

    return res.status(200).json({
      success: true,
      count: assets.length,
      data: assets
    });
  } catch (error) {
    next(error);
  }
}

async function decideModeration(req, res, next) {
  try {
    const { assetId } = req.params;
    const asset = await getAssetById(assetId);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    const updates = applyModeratorDecision(asset, req.body.decision, req.body.note || "");
    const updatedAsset = await updateAssetSystemFields(assetId, updates);

    await auditFromRequest(req, {
      action: "moderation.decision",
      targetType: "asset",
      targetId: assetId,
      metadata: {
        decision: req.body.decision,
        note: req.body.note || ""
      }
    });

    return res.status(200).json({
      success: true,
      message: "Moderation decision applied.",
      data: updatedAsset
    });
  } catch (error) {
    next(error);
  }
}

async function assetStats(req, res, next) {
  try {
    const assets = await getAllAssets();
    const visibleAssets = assets.filter((asset) => visibleToUser(req.user, asset));

    res.status(200).json({
      success: true,
      data: buildStats(visibleAssets)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAssets,
  getSingleAsset,
  createNewAsset,
  uploadAsset,
  streamAssetMedia,
  updateExistingAsset,
  deleteExistingAsset,
  restoreDeletedAsset,
  purgeDeletedAsset,
  recycleBin,
  assetStats,
  reportAsset,
  moderationQueue,
  decideModeration,
  createAssetShareLink,
  listAssetShareLinks,
  revokeAssetShareLink,
  streamSharedAssetMedia
};
