const jwt = require("jsonwebtoken");
const {
  createUser,
  validateUserCredentials,
  findUserById,
  sanitizeUser
} = require("../services/users.service");
const {
  createRefreshSession,
  rotateRefreshSession,
  revokeRefreshSession,
  listUserSessions,
  revokeSessionById,
  revokeAllUserSessions
} = require("../services/sessions.service");
const { softDeleteUser } = require("../services/users.service");
const { getAssetsByOwner } = require("../services/cosmos-assets.service");
const { ACCESS_COOKIE_NAME, getJwtSecret } = require("../middleware/auth.middleware");
const { auditFromRequest } = require("../services/audit.service");

const REFRESH_COOKIE_NAME = "hymedia_refresh_token";
const ACCESS_TOKEN_MINUTES = 15;

function issueToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      permissions: user.permissions || []
    },
    getJwtSecret(),
    { expiresIn: `${ACCESS_TOKEN_MINUTES}m` }
  );
}

function cookieOptions(maxAgeMs, httpOnly = true) {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: maxAgeMs,
    path: "/"
  };
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE_NAME, cookieOptions(0));
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(0));
}

async function setAuthCookies(req, res, user) {
  const accessToken = issueToken(user);
  const session = await createRefreshSession(user, {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip
  });

  res.cookie(
    ACCESS_COOKIE_NAME,
    accessToken,
    cookieOptions(ACCESS_TOKEN_MINUTES * 60 * 1000)
  );
  res.cookie(
    REFRESH_COOKIE_NAME,
    session.refreshToken,
    cookieOptions(7 * 24 * 60 * 60 * 1000)
  );

  return session.expiresAt;
}

async function signup(req, res, next) {
  try {
    const { displayName, email, password } = req.body;

    const user = await createUser({ displayName, email, password });
    const sessionExpiresAt = await setAuthCookies(req, res, user);

    await auditFromRequest(req, {
      action: "auth.signup",
      actorUserId: user.userId,
      actorEmail: user.email,
      targetType: "user",
      targetId: user.userId
    });

    return res.status(201).json({
      success: true,
      message: "HyMedia account created successfully.",
      sessionExpiresAt,
      user
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await validateUserCredentials(email, password);

    if (!user) {
      await auditFromRequest(req, {
        action: "auth.login.failed",
        actorEmail: email,
        targetType: "user",
        metadata: { reason: "invalid-credentials" }
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const sessionExpiresAt = await setAuthCookies(req, res, user);

    await auditFromRequest(req, {
      action: "auth.login.success",
      actorUserId: user.userId,
      actorEmail: user.email,
      targetType: "user",
      targetId: user.userId
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      sessionExpiresAt,
      user
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user
  });
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Session refresh token is missing."
      });
    }

    const rotated = await rotateRefreshSession(refreshToken, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip
    });

    if (!rotated) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Session expired. Please sign in again."
      });
    }

    const storedUser = await findUserById(rotated.session.userId);
    const user = sanitizeUser(storedUser);

    if (!user) {
      await revokeRefreshSession(rotated.refreshToken);
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Session user no longer exists."
      });
    }

    const accessToken = issueToken(user);
    res.cookie(
      ACCESS_COOKIE_NAME,
      accessToken,
      cookieOptions(ACCESS_TOKEN_MINUTES * 60 * 1000)
    );
    res.cookie(
      REFRESH_COOKIE_NAME,
      rotated.refreshToken,
      cookieOptions(7 * 24 * 60 * 60 * 1000)
    );

    await auditFromRequest(req, {
      action: "auth.refresh",
      actorUserId: user.userId,
      actorEmail: user.email,
      targetType: "session",
      targetId: rotated.session.sessionId
    });

    return res.status(200).json({
      success: true,
      message: "Session refreshed.",
      sessionExpiresAt: rotated.expiresAt,
      user
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await revokeRefreshSession(refreshToken);
    }

    await auditFromRequest(req, {
      action: "auth.logout",
      targetType: "session"
    });

    clearAuthCookies(res);
    return res.status(200).json({
      success: true,
      message: "Signed out."
    });
  } catch (error) {
    next(error);
  }
}

async function sessions(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || "";
    const userSessions = await listUserSessions(req.user.userId, refreshToken);

    return res.status(200).json({
      success: true,
      count: userSessions.length,
      data: userSessions
    });
  } catch (error) {
    next(error);
  }
}

async function revokeSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const revoked = await revokeSessionById(req.user.userId, sessionId);

    if (!revoked) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "Session not found."
      });
    }

    await auditFromRequest(req, {
      action: "auth.session.revoke",
      targetType: "session",
      targetId: sessionId
    });

    return res.status(200).json({
      success: true,
      message: "Session revoked.",
      data: revoked
    });
  } catch (error) {
    next(error);
  }
}

async function exportAccount(req, res, next) {
  try {
    const storedUser = await findUserById(req.user.userId);
    const user = sanitizeUser(storedUser);
    const assets = await getAssetsByOwner(req.user.userId);
    const userSessions = await listUserSessions(req.user.userId, req.cookies?.[REFRESH_COOKIE_NAME] || "");

    await auditFromRequest(req, {
      action: "auth.account.export",
      targetType: "user",
      targetId: req.user.userId
    });

    return res.status(200).json({
      success: true,
      exportedAt: new Date().toISOString(),
      data: {
        user,
        assets,
        sessions: userSessions
      }
    });
  } catch (error) {
    next(error);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const deletedUser = await softDeleteUser(req.user.userId);

    await revokeAllUserSessions(req.user.userId, "account-deleted");

    await auditFromRequest(req, {
      action: "auth.account.delete",
      targetType: "user",
      targetId: req.user.userId
    });

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Account deleted and current session revoked.",
      data: deletedUser
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  signup,
  login,
  me,
  refresh,
  logout,
  sessions,
  revokeSession,
  exportAccount,
  deleteAccount
};
