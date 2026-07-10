const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { getCosmosUsersContainer } = require("../config/cosmosClient");

const REFRESH_TOKEN_DAYS = 7;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createSecret() {
  return crypto.randomBytes(48).toString("base64url");
}

function buildRefreshToken(sessionId, secret) {
  return `${sessionId}.${secret}`;
}

function parseRefreshToken(refreshToken = "") {
  const [sessionId, secret] = String(refreshToken).split(".");
  if (!sessionId || !secret) return null;
  return { sessionId, secret };
}

async function createRefreshSession(user, metadata = {}) {
  const container = getCosmosUsersContainer();
  const now = new Date().toISOString();
  const sessionId = uuidv4();
  const secret = createSecret();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const session = {
    id: sessionId,
    sessionId,
    type: "session",
    userId: user.userId,
    tokenHash: hashToken(secret),
    createdAt: now,
    updatedAt: now,
    expiresAt,
    revokedAt: null,
    userAgent: metadata.userAgent || "",
    ipAddress: metadata.ipAddress || ""
  };

  await container.items.create(session);

  return {
    refreshToken: buildRefreshToken(sessionId, secret),
    expiresAt
  };
}

async function readSession(sessionId) {
  const container = getCosmosUsersContainer();

  try {
    const { resource } = await container.item(sessionId, sessionId).read();
    return resource || null;
  } catch (error) {
    if (error.code === 404) return null;
    throw error;
  }
}

async function replaceSession(session) {
  const container = getCosmosUsersContainer();
  const { resource } = await container.item(session.id, session.id).replace(session);
  return resource;
}

async function revokeRefreshSession(refreshToken) {
  const parsed = parseRefreshToken(refreshToken);
  if (!parsed) return;

  const session = await readSession(parsed.sessionId);
  if (!session) return;

  await replaceSession({
    ...session,
    revokedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

async function rotateRefreshSession(refreshToken, metadata = {}) {
  const parsed = parseRefreshToken(refreshToken);
  if (!parsed) return null;

  const session = await readSession(parsed.sessionId);
  const now = new Date();

  if (!session || session.type !== "session" || session.revokedAt) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= now.getTime()) {
    await replaceSession({
      ...session,
      revokedAt: now.toISOString(),
      updatedAt: now.toISOString()
    });
    return null;
  }

  if (session.tokenHash !== hashToken(parsed.secret)) {
    await replaceSession({
      ...session,
      revokedAt: now.toISOString(),
      revokedReason: "refresh-token-reuse",
      updatedAt: now.toISOString()
    });
    return null;
  }

  const nextSecret = createSecret();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const rotated = await replaceSession({
    ...session,
    tokenHash: hashToken(nextSecret),
    updatedAt: now.toISOString(),
    lastUsedAt: now.toISOString(),
    expiresAt,
    userAgent: metadata.userAgent || session.userAgent || "",
    ipAddress: metadata.ipAddress || session.ipAddress || ""
  });

  return {
    session: rotated,
    refreshToken: buildRefreshToken(rotated.sessionId, nextSecret),
    expiresAt
  };
}

module.exports = {
  REFRESH_TOKEN_DAYS,
  createRefreshSession,
  rotateRefreshSession,
  revokeRefreshSession
};
