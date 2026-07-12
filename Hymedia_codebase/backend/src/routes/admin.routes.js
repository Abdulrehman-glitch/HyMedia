const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  updateUserRoleSchema,
  userIdParamSchema,
  adminListUsersQuerySchema
} = require("../validators/admin.validators");
const { PERMISSIONS, requirePermission } = require("../security/permissions");
const {
  listUserAccounts,
  changeUserRole
} = require("../controllers/admin.controller");

const router = express.Router();

router.use(requireAuth, requirePermission(PERMISSIONS.USER_MANAGE_ROLES));

router.get("/users", validate(adminListUsersQuerySchema, "query"), listUserAccounts);
router.put("/users/:userId/role", validate(userIdParamSchema, "params"), validate(updateUserRoleSchema), changeUserRole);

module.exports = router;
