const { listUsers, findUserById, updateUserRole } = require("../services/users.service");
const { auditFromRequest } = require("../services/audit.service");
const { normalizeRole, ROLES } = require("../security/permissions");

async function listUserAccounts(req, res, next) {
  try {
    const users = await listUsers({
      limit: req.query.limit,
      offset: req.query.offset
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
}

async function changeUserRole(req, res, next) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const nextRole = normalizeRole(role);
    const adminRoles = new Set([ROLES.PLATFORM_ADMIN, ROLES.LEGACY_ADMIN]);

    if (userId === req.user.userId && !adminRoles.has(nextRole)) {
      return res.status(400).json({
        success: false,
        message: "Administrators cannot remove their own admin role."
      });
    }

    const existingUser = await findUserById(userId);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const updatedUser = await updateUserRole(userId, nextRole);

    await auditFromRequest(req, {
      action: "admin.user.role.update",
      targetType: "user",
      targetId: userId,
      metadata: {
        previousRole: existingUser.role,
        nextRole
      }
    });

    return res.status(200).json({
      success: true,
      message: "User role updated.",
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUserAccounts,
  changeUserRole
};
