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
      search: req.query.search
    });

    return sendSuccess(res, 200, "Assets retrieved successfully.", assets, {
      count: assets.length,
      filters: {
        mediaType: req.query.mediaType || null,
        tag: req.query.tag || null,
        search: req.query.search || null
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
      const error = new Error("Asset not found.");
      error.statusCode = 404;
      throw error;
    }

    return sendSuccess(res, 200, "Asset retrieved successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const createNewAsset = (req, res, next) => {
  try {
    const asset = createAsset(req.body);

    return sendSuccess(res, 201, "Asset created successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const updateExistingAsset = (req, res, next) => {
  try {
    const asset = updateAsset(req.params.assetId, req.body);

    if (!asset) {
      const error = new Error("Asset not found.");
      error.statusCode = 404;
      throw error;
    }

    return sendSuccess(res, 200, "Asset updated successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const deleteExistingAsset = (req, res, next) => {
  try {
    const asset = deleteAsset(req.params.assetId);

    if (!asset) {
      const error = new Error("Asset not found.");
      error.statusCode = 404;
      throw error;
    }

    return sendSuccess(res, 200, "Asset deleted successfully.", asset);
  } catch (error) {
    next(error);
  }
};

export const getStats = (req, res, next) => {
  try {
    const stats = getAssetStats();

    return sendSuccess(res, 200, "Asset statistics retrieved successfully.", stats);
  } catch (error) {
    next(error);
  }
};
