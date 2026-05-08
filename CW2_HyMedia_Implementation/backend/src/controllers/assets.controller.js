const {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  getAssetStats,
  detectMediaType
} = require("../services/cosmos-assets.service");

const {
  uploadFileToAzureBlob,
  getBlobDownloadResponse
} = require("../services/blob.service");

async function listAssets(req, res, next) {
  try {
    const assets = await getAllAssets({
      mediaType: req.query.mediaType,
      tag: req.query.tag,
      visibility: req.query.visibility
    });

    res.status(200).json({
      success: true,
      count: assets.length,
      data: assets
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
    const asset = await createAsset(req.body);

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
  try {
    const uploadedFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: "No media file uploaded. Please attach a file using form-data."
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
      visibility: (req.body.visibility || "PUBLIC").toUpperCase(),
      isSensitive: req.body.isSensitive === "true" || req.body.isSensitive === true,
      isAdult18Plus: req.body.isAdult18Plus === "true" || req.body.isAdult18Plus === true,
      processingStatus: "READY"
    });

    res.status(201).json({
      success: true,
      message: "HyMedia media file uploaded to Azure Blob Storage and metadata saved in Cosmos DB.",
      file: uploadedBlob,
      data: asset
    });
  } catch (error) {
    next(error);
  }
}

async function streamAssetMedia(req, res, next) {
  try {
    const { assetId } = req.params;
    const asset = await getAssetById(assetId);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    if (!asset.blobName) {
      return res.status(404).json({
        success: false,
        message: "Asset has no Blob Storage file linked."
      });
    }

    const downloadResponse = await getBlobDownloadResponse(asset.blobName);

    if (!downloadResponse || !downloadResponse.readableStreamBody) {
      return res.status(404).json({
        success: false,
        message: "Blob file not found in Azure Storage."
      });
    }

    res.setHeader("Content-Type", asset.mimeType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=300");
    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    next(error);
  }
}

async function updateExistingAsset(req, res, next) {
  try {
    const { assetId } = req.params;
    const updatedAsset = await updateAsset(assetId, req.body);

    if (!updatedAsset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

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
    const deletedAsset = await deleteAsset(assetId);

    if (!deletedAsset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "HyMedia asset metadata deleted successfully from Cosmos DB.",
      data: deletedAsset
    });
  } catch (error) {
    next(error);
  }
}

async function assetStats(req, res, next) {
  try {
    const stats = await getAssetStats();

    res.status(200).json({
      success: true,
      data: stats
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