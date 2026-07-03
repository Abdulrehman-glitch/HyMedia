const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { getCosmosUsersContainer } = require("../config/cosmosClient");

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    userId: user.userId,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

async function findUserByEmail(email) {
  const container = getCosmosUsersContainer();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const { resources } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.type = @type AND c.email = @email",
      parameters: [
        { name: "@type", value: "user" },
        { name: "@email", value: normalizedEmail }
      ]
    })
    .fetchAll();

  return resources[0] || null;
}

async function createUser({ displayName, email, password }) {
  const container = getCosmosUsersContainer();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    const error = new Error("A user with this email already exists.");
    error.status = 409;
    throw error;
  }

  const now = new Date().toISOString();
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: userId,
    userId,
    type: "user",
    displayName: displayName.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "user",
    failedLoginAttempts: 0,
    lockUntil: null,
    createdAt: now,
    updatedAt: now,
    provider: "HyMedia Local Auth",
    databaseService: "Azure Cosmos DB for NoSQL"
  };

  const response = await container.items.create(user);
  return sanitizeUser(response.resource);
}

async function findUserById(userId) {
  const container = getCosmosUsersContainer();

  try {
    const { resource } = await container.item(userId, userId).read();
    return resource || null;
  } catch (error) {
    if (error.code === 404) {
      return null;
    }

    throw error;
  }
}

async function replaceUser(user) {
  const container = getCosmosUsersContainer();
  const { resource } = await container.item(user.id, user.id).replace(user);
  return resource;
}

function isUserLocked(user) {
  return user.lockUntil && new Date(user.lockUntil).getTime() > Date.now();
}

async function recordFailedLogin(user) {
  const failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
  const shouldLock = failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;
  const lockUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
    : user.lockUntil || null;

  await replaceUser({
    ...user,
    failedLoginAttempts,
    lockUntil,
    updatedAt: new Date().toISOString()
  });
}

async function recordSuccessfulLogin(user) {
  await replaceUser({
    ...user,
    failedLoginAttempts: 0,
    lockUntil: null,
    lastLoginAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

async function validateUserCredentials(email, password) {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  if (isUserLocked(user)) {
    const error = new Error("Account temporarily locked after repeated failed login attempts.");
    error.status = 423;
    throw error;
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    await recordFailedLogin(user);
    return null;
  }

  await recordSuccessfulLogin(user);
  return sanitizeUser(user);
}

module.exports = {
  createUser,
  validateUserCredentials,
  findUserById,
  findUserByEmail,
  sanitizeUser,
  isUserLocked
};
