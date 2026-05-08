const { CosmosClient } = require("@azure/cosmos");

function getCosmosAssetsContainer() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseName = process.env.COSMOS_DATABASE_NAME || "hymedia-db";
  const containerName = process.env.COSMOS_CONTAINER_NAME || "assets";

  if (!endpoint || !key) {
    throw new Error("COSMOS_ENDPOINT or COSMOS_KEY is missing in .env");
  }

  const client = new CosmosClient({
    endpoint,
    key
  });

  return client.database(databaseName).container(containerName);
}

module.exports = {
  getCosmosAssetsContainer
};