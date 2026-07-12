const { z } = require("zod");

const userRoleSchema = z.enum(["user", "creator", "moderator", "admin"]);

const updateUserRoleSchema = z
  .object({
    role: userRoleSchema
  })
  .strict();

module.exports = {
  userRoleSchema,
  updateUserRoleSchema
};
