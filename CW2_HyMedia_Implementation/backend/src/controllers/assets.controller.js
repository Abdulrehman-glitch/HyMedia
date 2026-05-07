const path = require("path");
const {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetStats
} = require("../services/assets.memory.service");

function listAssets(req, res) {
  const assets = getAllAssets({
    mediaType: req.query.mediaType,
    tag: req.query.tag,
    visibility: req.query.visibility
  });

  res.status(200).json({
    success: true,
    count: assets.length,
    data: assets
  });
}

function getSingleAsset(req, res) {
  const { assetId } = req.params;
  const asset = getAssetById(assetId);

  if (!asset) {
    return res.status(404).json({
      success: false,
      message: "Asset not found"
    });
  }

  res.status(200).json({
    success: true,
    data: asset
  });
}

function createNewAsset(req, res) {
  const asset = createAsset(req.body);

  res.status(201).json({
    success: true,
    message: "HyMedia asset metadata created successfully.",
    data: asset
  });
}

function uploadAsset(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No media file uploaded."
    });
  }

  const fileExtension = path.extname(req.file.originalname).toLowerCase();

  let mediaType = "other";

  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(fileExtension)) {
    mediaType = "image";
  }

  if ([".mp4", ".mov", ".webm", ".mkv"].includes(fileExtension)) {
    mediaType = "video";
  }

  if ([".mp3", ".wav", ".aac", ".m4a", ".ogg"].includes(fileExtension)) {
    mediaType = "audio";
  }

  const asset = createAsset({
    title: req.body.title || req.file.originalname,
    caption: req.body.caption || "",
    mediaType,
    mimeType: req.file.mimetype,
    fileName: req.file.originalname,
    blobUrl: `local-upload://${req.file.filename}`,
    tags: req.body.tags
      ? req.body.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [],
    location: req.body.location || "",
    visibility: req.body.visibility || "PUBLIC",
    isSensitive: req.body.isSensitive === "true",
    isAdult18Plus: req.body.isAdult18Plus === "true",
    processingStatus: "READY"
  });

  res.status(201).json({
    success: true,
    message: "HyMedia media file uploaded locally and metadata stored successfully.",
    file: {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size
    },
    data: asset
  });
}

function updateExistingAsset(req, res) {
  const { assetId } = req.params;
  const updatedAsset = updateAsset(assetId, req.body);

  if (!updatedAsset) {
    return res.status(404).json({
      success: false,
      message: "Asset not found"
    });
  }

  res.status(200).json({
    success: true,
    message: "HyMedia asset updated successfully.",
    data: updatedAsset
  });
}

function deleteExistingAsset(req, res) {
  const { assetId } = req.params;
  const deletedAsset = deleteAsset(assetId);

  if (!deletedAsset) {
    return res.status(404).json({
      success: false,
      message: "Asset not found"
    });
  }

  res.status(200).json({
    success: true,
    message: "HyMedia asset deleted successfully.",
    data: deletedAsset
  });
}

function assetStats(req, res) {
  res.status(200).json({
    success: true,
    data: getAssetStats()
  });
}

module.exports = {
  listAssets,
  getSingleAsset,
  createNewAsset,
  uploadAsset,
  updateExistingAsset,
  deleteExistingAsset,
  assetStats
};