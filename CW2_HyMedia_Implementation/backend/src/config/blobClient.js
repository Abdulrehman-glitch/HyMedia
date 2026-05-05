import { BlobServiceClient } from "@azure/storage-blob";
import { env } from "./env.js";

export const getBlobContainerClient = async () => {
  if (!env.azureStorageConnectionString) {
    const error = new Error("Azure Storage connection string is missing. Check AZURE_STORAGE_CONNECTION_STRING in .env.");
    error.statusCode = 500;
    throw error;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    env.azureStorageConnectionString
  );

  const containerClient = blobServiceClient.getContainerClient(
    env.azureStorageContainerName
  );

  await containerClient.createIfNotExists();

  return containerClient;
};
