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

module.exports = {
  assetCreateSchema,
  assetUpdateSchema,
  reportAssetSchema,
  moderationDecisionSchema,
  visibilitySchema,
  visibilityInputSchema,
  normalizeVisibilityInput,
  VISIBILITY
};
