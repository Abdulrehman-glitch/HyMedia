const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { updateUserRoleSchema } = require("../validators/admin.validators");
const {
  listUserAccounts,
  changeUserRole
} = require("../controllers/admin.controller");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/users", listUserAccounts);
router.put("/users/:userId/role", validate(updateUserRoleSchema), changeUserRole);

module.exports = router;
