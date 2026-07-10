const { BlobServiceClient } = require("@azure/storage-blob");

function getBlobContainerClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "media";

  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is missing in .env");
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  return blobServiceClient.getContainerClient(containerName);
}

module.exports = {
  getBlobContainerClient
};