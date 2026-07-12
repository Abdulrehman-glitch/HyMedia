function sanitizeAsset(asset) {
  if (!asset) return null;

  const {
    blobName,
    blobUrl,
    _rid,
    _self,
    _attachments,
    _ts,
    _etag,
    ...safeAsset
  } = asset;

  return {
    ...safeAsset,
    blobUrl: "",
    hasMedia: Boolean(blobName),
    etag: _etag || asset.etag || null
  };
}

function sanitizeAssets(assets = []) {
  return assets.map((asset) => sanitizeAsset(asset));
}

module.exports = {
  sanitizeAsset,
  sanitizeAssets
};
