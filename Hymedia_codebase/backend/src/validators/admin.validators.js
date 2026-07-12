const { z } = require("zod");
const { ROLES } = require("../security/permissions");

const userRoleSchema = z.enum([
  ROLES.USER,
  ROLES.CREATOR,
  ROLES.MODERATOR,
  ROLES.ORGANISATION_ADMIN,
  ROLES.PLATFORM_ADMIN,
  ROLES.LEGACY_ADMIN
]);

const updateUserRoleSchema = z
  .object({
    role: userRoleSchema
  })
  .strict();
const userIdParamSchema = z.object({
  userId: z.string().trim().min(1).max(120)
}).strict();
const adminListUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(100000).optional()
}).strict();

module.exports = {
  userRoleSchema,
  updateUserRoleSchema,
  userIdParamSchema,
  adminListUsersQuerySchema
};
