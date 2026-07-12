const { z } = require("zod");

const VISIBILITY = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
  UNLISTED: "UNLISTED",
  ORG_ONLY: "ORG_ONLY",
  SHARED: "SHARED",
  PASSWORD_PROTECTED: "PASSWORD_PROTECTED"
};

const legacyVisibilityMap = {
  PRIVATE_SELECTED: VISIBILITY.PRIVATE,
  UNLISTED_LINK: VISIBILITY.UNLISTED,
  CREATOR_PREMIUM: VISIBILITY.SHARED
};

function normalizeVisibilityInput(value) {
  const visibility = String(value || VISIBILITY.PUBLIC).trim().toUpperCase();
  return legacyVisibilityMap[visibility] || visibility;
}

const visibilitySchema = z.enum(Object.values(VISIBILITY));
const visibilityInputSchema = z.preprocess(normalizeVisibilityInput, visibilitySchema);
const assetIdParamSchema = z.object({
  assetId: z.string().trim().min(1).max(120)
}).strict();
const shareTokenParamSchema = z.object({
  token: z.string().trim().min(16).max(256)
}).strict();
const shareIdParamSchema = z.object({
  shareId: z.string().trim().min(1).max(120)
}).strict();
const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(100000).optional()
}).strict();
const assetListQuerySchema = paginationQuerySchema.extend({
  mediaType: z.enum(["image", "video", "audio", "other"]).optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  visibility: visibilityInputSchema.optional()
}).strict();

const csvOrArrayTags = z.union([
  z.string().max(400),
  z.array(z.string().trim().min(1).max(40)).max(20)
]);

const assetCreateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  caption: z.string().trim().max(1000).optional(),
  mediaType: z.enum(["image", "video", "audio", "other"]).optional(),
  tags: csvOrArrayTags.optional(),
  location: z.string().trim().max(120).optional(),
  visibility: visibilityInputSchema.optional(),
  isSensitive: z.boolean().optional(),
  isAdult18Plus: z.boolean().optional()
}).strict();

const assetUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    caption: z.string().trim().max(1000).optional(),
    tags: csvOrArrayTags.optional(),
    location: z.string().trim().max(120).optional(),
    visibility: visibilityInputSchema.optional(),
    isSensitive: z.boolean().optional(),
    isAdult18Plus: z.boolean().optional()
  })
  .strict();

const reportAssetSchema = z
  .object({
    reason: z.enum(["abuse", "copyright", "privacy", "spam", "unsafe", "other"]),
    note: z.string().trim().max(1000).optional()
  })
  .strict();

const moderationDecisionSchema = z
  .object({
    decision: z.enum(["approve", "mark_sensitive", "quarantine", "remove"]),
    note: z.string().trim().max(1000).optional()
  })
  .strict();

const shareLinkCreateSchema = z
  .object({
    expiresInHours: z.number().int().min(1).max(24 * 30).optional(),
    permission: z.enum(["view"]).optional()
  })
  .strict();

module.exports = {
  assetCreateSchema,
  assetUpdateSchema,
  assetIdParamSchema,
  shareTokenParamSchema,
  shareIdParamSchema,
  paginationQuerySchema,
  assetListQuerySchema,
  reportAssetSchema,
  moderationDecisionSchema,
  shareLinkCreateSchema,
  visibilitySchema,
  visibilityInputSchema,
  normalizeVisibilityInput,
  VISIBILITY
};
