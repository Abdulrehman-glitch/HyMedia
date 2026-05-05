import path from "path";
import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential
} from "@azure/storage-blob";
import { getBlobContainerClient } from "../config/blobClient.js";
import { env } from "../config/env.js";

const cleanFileName = (fileName) => {
  const parsed = path.parse(fileName);
  const safeBase = parsed.name
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 80);

  const safeExt = parsed.ext.toLowerCase();

  return (safeBase || "media-file") + safeExt;
};

const parseStorageConnectionString = () => {
  const parts = Object.fromEntries(
    env.azureStorageConnectionString
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), part.slice(index + 1)];
      })
  );

  if (!parts.AccountName || !parts.AccountKey) {
    const error = new Error("Storage connection string must include AccountName and AccountKey.");
    error.statusCode = 500;
    throw error;
  }

  return {
    accountName: parts.AccountName,
    accountKey: parts.AccountKey
  };
};

export const generateReadSasUrl = ({ blobName, expiresInHours = 24 }) => {
  const { accountName, accountKey } = parseStorageConnectionString();

  const credential = new StorageSharedKeyCredential(accountName, accountKey);

  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: env.azureStorageContainerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn
    },
    credential
  ).toString();

  return `https://${accountName}.blob.core.windows.net/${env.azureStorageContainerName}/${blobName}?${sasToken}`;
};

export const uploadFileToBlob = async ({ file, assetId, ownerId }) => {
  const containerClient = await getBlobContainerClient();

  const safeFileName = cleanFileName(file.originalname);
  const timestamp = Date.now();

  const blobName = [
    "assets",
    ownerId || "demo_user",
    assetId,
    "original-" + timestamp + "-" + safeFileName
  ].join("/");

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype
    },
    metadata: {
      assetId,
      ownerId: ownerId || "demo_user",
      originalFileName: file.originalname
    }
  });

  const signedBlobUrl = generateReadSasUrl({
    blobName,
    expiresInHours: 24
  });

  return {
    blobName,
    blobUrl: signedBlobUrl,
    originalBlobUrl: blockBlobClient.url,
    fileName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size
  };
};
