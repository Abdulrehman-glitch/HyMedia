const fs = require("fs");
const path = require("path");
const { getBlobContainerClient } = require("../config/blobClient");

function getBlockBlobClient(blobName) {
  const containerClient = getBlobContainerClient();
  return containerClient.getBlockBlobClient(blobName);
}

async function uploadFileToAzureBlob(file) {
  const containerClient = getBlobContainerClient();

  await containerClient.createIfNotExists();

  const extension = path.extname(file.originalname).toLowerCase();
  const safeOriginalName = file.originalname.replace(/\s+/g, "-").toLowerCase();
  const blobName = `assets/${new Date().getFullYear()}/${Date.now()}-${safeOriginalName}`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadFile(file.path, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype
    },
    metadata: {
      originalName: safeOriginalName,
      uploadedBy: "hymedia-cw2"
    }
  });

  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  return {
    blobName,
    blobUrl: blockBlobClient.url,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    extension
  };
}

async function getBlobProperties(blobName) {
  const blockBlobClient = getBlockBlobClient(blobName);
  return blockBlobClient.getProperties();
}

async function downloadBlobRange(blobName, start, count) {
  const blockBlobClient = getBlockBlobClient(blobName);
  return blockBlobClient.download(start, count);
}

module.exports = {
  uploadFileToAzureBlob,
  getBlobProperties,
  downloadBlobRange
};