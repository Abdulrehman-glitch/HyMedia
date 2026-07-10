const { z } = require("zod");

const visibilitySchema = z.enum(["PUBLIC", "PRIVATE_SELECTED", "UNLISTED_LINK", "CREATOR_PREMIUM"]);

const csvOrArrayTags = z.union([
  z.string().max(400),
  z.array(z.string().trim().min(1).max(40)).max(20)
]);

const assetCreateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  caption: z.string().trim().max(1000).optional(),
  mediaType: z.enum(["image", "video", "audio", "other"]).optional(),
  mimeType: z.string().trim().max(120).optional(),
  fileName: z.string().trim().max(255).optional(),
  blobName: z.string().trim().max(1024).optional(),
  blobUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
  tags: csvOrArrayTags.optional(),
  location: z.string().trim().max(120).optional(),
  visibility: visibilitySchema.optional(),
  isSensitive: z.boolean().optional(),
  isAdult18Plus: z.boolean().optional()
});

const assetUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    caption: z.string().trim().max(1000).optional(),
    tags: csvOrArrayTags.optional(),
    location: z.string().trim().max(120).optional(),
    visibility: visibilitySchema.optional(),
    isSensitive: z.boolean().optional(),
    isAdult18Plus: z.boolean().optional()
  })
  .strict();

module.exports = {
  assetCreateSchema,
  assetUpdateSchema,
  visibilitySchema
};
