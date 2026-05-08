const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { getCosmosUsersContainer } = require("../config/cosmosClient");

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
    createdAt: now,
    updatedAt: now,
    provider: "HyMedia Local Auth",
    databaseService: "Azure Cosmos DB for NoSQL"
  };

  const response = await container.items.create(user);
  return sanitizeUser(response.resource);
}

async function validateUserCredentials(email, password) {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    return null;
  }

  return sanitizeUser(user);
}

module.exports = {
  createUser,
  validateUserCredentials,
  findUserByEmail,
  sanitizeUser
};