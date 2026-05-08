const { CosmosClient } = require("@azure/cosmos");

function getCosmosClient() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;

  if (!endpoint || !key) {
    throw new Error("COSMOS_ENDPOINT or COSMOS_KEY is missing.");
  }

  return new CosmosClient({ endpoint, key });
}

function getCosmosAssetsContainer() {
  const client = getCosmosClient();
  const databaseName = process.env.COSMOS_DATABASE_NAME || "hymedia-db";
  const containerName = process.env.COSMOS_CONTAINER_NAME || "assets";

  return client.database(databaseName).container(containerName);
}

function getCosmosUsersContainer() {
  const client = getCosmosClient();
  const databaseName = process.env.COSMOS_DATABASE_NAME || "hymedia-db";
  const containerName = process.env.COSMOS_USERS_CONTAINER_NAME || "users";

  return client.database(databaseName).container(containerName);
}

module.exports = {
  getCosmosAssetsContainer,
  getCosmosUsersContainer
};