const {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  detectMediaType
} = require("../services/cosmos-assets.service");

const fs = require("fs");
const path = require("path");
const {
  uploadFileToAzureBlob,
  getBlobProperties,
  downloadBlobRange,
  deleteBlobIfExists
} = require("../services/blob.service");
const { isAdmin } = require("../middleware/auth.middleware");
const { visibilitySchema } = require("../validators/assets.validators");

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
  const visibility = String(value || "PUBLIC").toUpperCase();
  const parsed = visibilitySchema.safeParse(visibility);
  return parsed.success ? parsed.data : null;
}

function canManageAsset(user, asset) {
  if (!user || !asset) return false;
  if (isAdmin(user)) return true;
  return Boolean(asset.ownerId && asset.ownerId === user.userId);
}

function canViewAsset(user, asset) {
  if (!asset) return false;
  if (asset.visibility === "PUBLIC" || asset.visibility === "UNLISTED_LINK") return true;
  return canManageAsset(user, asset);
}

function visibleToUser(user, asset) {
  if (canManageAsset(user, asset)) return true;
  return asset.visibility === "PUBLIC";
}

function buildStats(assets) {
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
}

async function listAssets(req, res, next) {
  try {
    const assets = await getAllAssets({
      mediaType: req.query.mediaType,
      tag: req.query.tag,
      visibility: req.query.visibility
    });
    const visibleAssets = assets.filter((asset) => visibleToUser(req.user, asset));

    res.status(200).json({
      success: true,
      count: visibleAssets.length,
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

    if (!asset) {
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
    const asset = await createAsset({
      ...req.body,
      ownerId: req.user?.userId,
      ownerEmail: req.user?.email
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

    const uploadedBlob = await uploadFileToAzureBlob(uploadedFile);

    const asset = await createAsset({
      title: req.body.title || uploadedBlob.originalName,
      caption: req.body.caption || "",
      mediaType: detectMediaType(uploadedBlob.mimeType),
      mimeType: uploadedBlob.mimeType,
      fileName: uploadedBlob.originalName,
      blobName: uploadedBlob.blobName,
      blobUrl: uploadedBlob.blobUrl,
      tags: req.body.tags || [],
      location: req.body.location || "",
      visibility,
      isSensitive: normalizeBoolean(req.body.isSensitive),
      isAdult18Plus: normalizeBoolean(req.body.isAdult18Plus),
      processingStatus: "READY",
      ownerId: req.user?.userId,
      ownerEmail: req.user?.email
    });

    res.status(201).json({
      success: true,
      message: "HyMedia media file uploaded to Azure Blob Storage and metadata saved in Cosmos DB.",
      file: uploadedBlob,
      data: asset
    });
  } catch (error) {
    cleanupUploadedFile(uploadedFile);
    next(error);
  }
}

async function streamAssetMedia(req, res, next) {
  try {
    const { assetId } = req.params;
    const asset = await getAssetById(assetId);

    if (!asset || !asset.blobName) {
      return res.status(404).json({
        success: false,
        message: "Asset media not found."
      });
    }

    if (!canViewAsset(req.user, asset)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this media."
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

    if (!existingAsset) {
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

    const updatedAsset = await updateAsset(assetId, req.body);

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

    if (existingAsset.blobName) {
      await deleteBlobIfExists(existingAsset.blobName);
    }

    const deletedAsset = await deleteAsset(assetId);

    res.status(200).json({
      success: true,
      message: "HyMedia asset and linked media deleted successfully.",
      data: deletedAsset
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
  assetStats
};
