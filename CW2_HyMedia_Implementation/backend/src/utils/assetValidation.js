const allowedVisibilityValues = ["PUBLIC", "PRIVATE", "UNLISTED"];
const allowedMediaTypes = ["image", "video", "audio", "gif"];

const normaliseTags = (tags) => {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags
      .map((tag) => String(tag).trim().toLowerCase())
      .filter(Boolean);
  }

  return String(tags)
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
};

export const validateCreateAssetPayload = (payload) => {
  const errors = [];

  const title = payload.title ? String(payload.title).trim() : "";
  const description = payload.description ? String(payload.description).trim() : "";
  const mediaType = payload.mediaType ? String(payload.mediaType).trim().toLowerCase() : "";
  const visibility = payload.visibility ? String(payload.visibility).trim().toUpperCase() : "PUBLIC";
  const ownerId = payload.ownerId ? String(payload.ownerId).trim() : "demo_user";
  const blobUrl = payload.blobUrl ? String(payload.blobUrl).trim() : "";
  const mimeType = payload.mimeType ? String(payload.mimeType).trim() : "";
  const fileName = payload.fileName ? String(payload.fileName).trim() : "";

  if (!title) {
    errors.push("Title is required.");
  }

  if (title.length > 120) {
    errors.push("Title must not exceed 120 characters.");
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
    errors.push("Visibility must be one of: PUBLIC, PRIVATE, UNLISTED.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      title,
      description,
      mediaType,
      visibility,
      ownerId,
      blobUrl,
      mimeType,
      fileName,
      tags: normaliseTags(payload.tags),
      isSensitive: Boolean(payload.isSensitive),
      isAdult18Plus: Boolean(payload.isAdult18Plus)
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
      errors.push("Visibility must be one of: PUBLIC, PRIVATE, UNLISTED.");
    }

    update.visibility = visibility;
  }

  if (payload.tags !== undefined) {
    update.tags = normaliseTags(payload.tags);
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
    update.isSensitive = Boolean(payload.isSensitive);
  }

  if (payload.isAdult18Plus !== undefined) {
    update.isAdult18Plus = Boolean(payload.isAdult18Plus);
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: update
  };
};
