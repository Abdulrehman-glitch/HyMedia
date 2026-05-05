const maxFileSizeBytes = 25 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/mp4",
  "audio/ogg"
]);

const mimeToMediaType = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "gif",
  "image/webp": "image",
  "image/bmp": "image",
  "image/tiff": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "video/x-matroska": "video",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/aac": "audio",
  "audio/mp4": "audio",
  "audio/ogg": "audio"
};

export const validateUploadedFile = (file) => {
  const errors = [];

  if (!file) {
    errors.push("Media file is required.");
    return {
      isValid: false,
      errors
    };
  }

  if (file.size > maxFileSizeBytes) {
    errors.push("File size must not exceed 25MB for the coursework demo.");
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    errors.push("Unsupported file type. HyMedia supports images, GIFs, videos and audio files.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const detectMediaType = (mimeType) => {
  return mimeToMediaType[mimeType] || "image";
};

export const getAllowedUploadSummary = () => {
  return {
    maxFileSizeMb: 25,
    supportedTypes: [
      "Images: JPG, JPEG, PNG, GIF, WEBP, BMP, TIFF",
      "Videos: MP4, MOV, WEBM, MKV",
      "Audio: MP3, WAV, AAC/M4A, OGG"
    ]
  };
};
