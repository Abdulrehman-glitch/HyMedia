const fs = require("fs");

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content.trimStart(), "utf8");
  console.log("Updated " + filePath);
}

console.log("Applying HyMedia SAS URL and boolean parsing fixes...");

writeFile("src/services/blobService.js", `
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

  return \`https://\${accountName}.blob.core.windows.net/\${env.azureStorageContainerName}/\${blobName}?\${sasToken}\`;
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
`);

writeFile("src/utils/assetValidation.js", `
const allowedVisibilityValues = [
  "PUBLIC",
  "PRIVATE_SELECTED",
  "UNLISTED_LINK",
  "CREATOR_PREMIUM"
];

const allowedMediaTypes = ["image", "video", "audio", "gif"];

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalised = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalised)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalised)) {
    return false;
  }

  return fallback;
};

const normaliseList = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normaliseTags = (tags) => {
  return normaliseList(tags)
    .map((tag) => {
      const cleaned = tag.replace(/^#/, "").trim().toLowerCase();
      return cleaned ? "#" + cleaned : "";
    })
    .filter(Boolean);
};

const normaliseTaggedUsers = (taggedUsers) => {
  return normaliseList(taggedUsers)
    .map((user) => {
      const cleaned = user.replace(/^@/, "").trim().toLowerCase();
      return cleaned ? "@" + cleaned : "";
    })
    .filter(Boolean);
};

export const validateCreateAssetPayload = (payload) => {
  const errors = [];

  const title = payload.title ? String(payload.title).trim() : "";
  const caption = payload.caption ? String(payload.caption).trim() : "";
  const description = payload.description ? String(payload.description).trim() : "";
  const mediaType = payload.mediaType ? String(payload.mediaType).trim().toLowerCase() : "";
  const visibility = payload.visibility ? String(payload.visibility).trim().toUpperCase() : "PUBLIC";
  const ownerId = payload.ownerId ? String(payload.ownerId).trim() : "demo_user";
  const blobUrl = payload.blobUrl ? String(payload.blobUrl).trim() : "";
  const mimeType = payload.mimeType ? String(payload.mimeType).trim() : "";
  const fileName = payload.fileName ? String(payload.fileName).trim() : "";
  const locationName = payload.locationName ? String(payload.locationName).trim() : "";

  if (!title) {
    errors.push("Title is required.");
  }

  if (title.length > 120) {
    errors.push("Title must not exceed 120 characters.");
  }

  if (caption.length > 280) {
    errors.push("Caption must not exceed 280 characters.");
  }

  if (description.length > 1000) {
    errors.push("Description must not exceed 1000 characters.");
  }

  if (!mediaType) {
    errors.push("Media type is required.");
  }

  if (mediaType && !allowedMediaTypes.includes(mediaType)) {
    errors.push("Media type must be one of: image, video, audio, gif.");
  }

  if (!allowedVisibilityValues.includes(visibility)) {
    errors.push("Visibility must be one of: PUBLIC, PRIVATE_SELECTED, UNLISTED_LINK, CREATOR_PREMIUM.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      title,
      caption,
      description,
      mediaType,
      visibility,
      ownerId,
      blobUrl,
      mimeType,
      fileName,
      locationName,
      hashtags: normaliseTags(payload.hashtags || payload.tags),
      taggedUsers: normaliseTaggedUsers(payload.taggedUsers),
      isSensitive: toBoolean(payload.isSensitive, false),
      isAdult18Plus: toBoolean(payload.isAdult18Plus, false),
      allowComments: toBoolean(payload.allowComments, true)
    }
  };
};

export const validateUpdateAssetPayload = (payload) => {
  const errors = [];
  const update = {};

  if (payload.title !== undefined) {
    const title = String(payload.title).trim();

    if (!title) {
      errors.push("Title cannot be empty.");
    }

    if (title.length > 120) {
      errors.push("Title must not exceed 120 characters.");
    }

    update.title = title;
  }

  if (payload.caption !== undefined) {
    const caption = String(payload.caption).trim();

    if (caption.length > 280) {
      errors.push("Caption must not exceed 280 characters.");
    }

    update.caption = caption;
  }

  if (payload.description !== undefined) {
    const description = String(payload.description).trim();

    if (description.length > 1000) {
      errors.push("Description must not exceed 1000 characters.");
    }

    update.description = description;
  }

  if (payload.mediaType !== undefined) {
    const mediaType = String(payload.mediaType).trim().toLowerCase();

    if (!allowedMediaTypes.includes(mediaType)) {
      errors.push("Media type must be one of: image, video, audio, gif.");
    }

    update.mediaType = mediaType;
  }

  if (payload.visibility !== undefined) {
    const visibility = String(payload.visibility).trim().toUpperCase();

    if (!allowedVisibilityValues.includes(visibility)) {
      errors.push("Visibility must be one of: PUBLIC, PRIVATE_SELECTED, UNLISTED_LINK, CREATOR_PREMIUM.");
    }

    update.visibility = visibility;
  }

  if (payload.hashtags !== undefined || payload.tags !== undefined) {
    update.hashtags = normaliseTags(payload.hashtags || payload.tags);
    update.tags = update.hashtags;
  }

  if (payload.taggedUsers !== undefined) {
    update.taggedUsers = normaliseTaggedUsers(payload.taggedUsers);
  }

  if (payload.locationName !== undefined) {
    update.locationName = String(payload.locationName).trim();
  }

  if (payload.blobUrl !== undefined) {
    update.blobUrl = String(payload.blobUrl).trim();
  }

  if (payload.mimeType !== undefined) {
    update.mimeType = String(payload.mimeType).trim();
  }

  if (payload.fileName !== undefined) {
    update.fileName = String(payload.fileName).trim();
  }

  if (payload.isSensitive !== undefined) {
    update.isSensitive = toBoolean(payload.isSensitive, false);
  }

  if (payload.isAdult18Plus !== undefined) {
    update.isAdult18Plus = toBoolean(payload.isAdult18Plus, false);
  }

  if (payload.allowComments !== undefined) {
    update.allowComments = toBoolean(payload.allowComments, true);
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: update
  };
};
`);

console.log("SAS URL and boolean fixes applied successfully.");