const ROLES = {
  USER: "user",
  CREATOR: "creator",
  MODERATOR: "moderator",
  ORGANISATION_ADMIN: "organisation_admin",
  PLATFORM_ADMIN: "platform_admin",
  LEGACY_ADMIN: "admin"
};

const PERMISSIONS = {
  ASSET_CREATE: "asset:create",
  ASSET_READ_PRIVATE: "asset:read-private",
  ASSET_MANAGE_OWN: "asset:manage-own",
  ASSET_MANAGE_ANY: "asset:manage-any",
  ASSET_SHARE: "asset:share",
  MODERATION_REVIEW: "moderation:review",
  USER_READ: "user:read",
  USER_MANAGE_ROLES: "user:manage-roles",
  ACCOUNT_EXPORT: "account:export",
  ACCOUNT_DELETE: "account:delete"
};

const rolePermissions = {
  [ROLES.USER]: [
    PERMISSIONS.ASSET_CREATE,
    PERMISSIONS.ASSET_MANAGE_OWN,
    PERMISSIONS.ASSET_SHARE,
    PERMISSIONS.ACCOUNT_EXPORT,
    PERMISSIONS.ACCOUNT_DELETE
  ],
  [ROLES.CREATOR]: [
    PERMISSIONS.ASSET_CREATE,
    PERMISSIONS.ASSET_MANAGE_OWN,
    PERMISSIONS.ASSET_SHARE,
    PERMISSIONS.ACCOUNT_EXPORT,
    PERMISSIONS.ACCOUNT_DELETE
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.ASSET_CREATE,
    PERMISSIONS.ASSET_MANAGE_OWN,
    PERMISSIONS.ASSET_SHARE,
    PERMISSIONS.MODERATION_REVIEW,
    PERMISSIONS.ACCOUNT_EXPORT,
    PERMISSIONS.ACCOUNT_DELETE
  ],
  [ROLES.ORGANISATION_ADMIN]: [
    PERMISSIONS.ASSET_CREATE,
    PERMISSIONS.ASSET_READ_PRIVATE,
    PERMISSIONS.ASSET_MANAGE_OWN,
    PERMISSIONS.ASSET_SHARE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.ACCOUNT_EXPORT,
    PERMISSIONS.ACCOUNT_DELETE
  ],
  [ROLES.PLATFORM_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.LEGACY_ADMIN]: Object.values(PERMISSIONS)
};

function normalizeRole(role) {
  const normalized = String(role || ROLES.USER).trim().toLowerCase().replace(/-/g, "_");
  if (normalized === "organisation admin") return ROLES.ORGANISATION_ADMIN;
  if (normalized === "organization_admin" || normalized === "organization admin") return ROLES.ORGANISATION_ADMIN;
  if (normalized === "platform admin") return ROLES.PLATFORM_ADMIN;
  return rolePermissions[normalized] ? normalized : ROLES.USER;
}

function permissionsForRole(role) {
  return [...new Set(rolePermissions[normalizeRole(role)] || rolePermissions[ROLES.USER])];
}

function permissionsForUser(user) {
  const roleBased = permissionsForRole(user?.role);
  const explicit = Array.isArray(user?.permissions) ? user.permissions : [];
  return [...new Set([...roleBased, ...explicit])];
}

function hasPermission(user, permission) {
  return permissionsForUser(user).includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHENTICATED",
        requestId: req.requestId,
        message: "Please login before performing this action."
      });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        requestId: req.requestId,
        message: "You do not have permission to perform this action."
      });
    }

    return next();
  };
}

module.exports = {
  ROLES,
  PERMISSIONS,
  normalizeRole,
  permissionsForRole,
  permissionsForUser,
  hasPermission,
  requirePermission
};
