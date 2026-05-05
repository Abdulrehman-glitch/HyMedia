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
