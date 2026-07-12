const { getBlobContainerClient } = require("../config/blobClient");
const { getCosmosAssetsContainer, getCosmosUsersContainer } = require("../config/cosmosClient");

const DEFAULT_PROBE_TIMEOUT_MS = 3000;

function withTimeout(name, promise, timeoutMs = DEFAULT_PROBE_TIMEOUT_MS) {
  let timeout;

  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(() => {
      resolve({
        name,
        status: "unhealthy",
        reason: "probe-timeout"
      });
    }, timeoutMs);
  });

  return Promise.race([
    promise
      .then(() => ({
        name,
        status: "healthy"
      }))
      .catch((error) => ({
        name,
        status: "unhealthy",
        reason: error.message
      })),
    timeoutPromise
  ]).finally(() => clearTimeout(timeout));
}

function dependencyConfigured() {
  return {
    jwtSecret: Boolean(process.env.JWT_SECRET),
    storage: Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING),
    cosmos: Boolean(process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY),
    appInsights: Boolean(process.env.APPINSIGHTS_CONNECTION_STRING)
  };
}

async function probeDependencies() {
  const configured = dependencyConfigured();
  const probes = [];

  probes.push({
    name: "jwt-secret",
    status: configured.jwtSecret ? "healthy" : "unhealthy",
    reason: configured.jwtSecret ? undefined : "JWT_SECRET is missing"
  });

  if (configured.storage) {
    probes.push(withTimeout("azure-blob-storage", getBlobContainerClient().getProperties()));
  } else {
    probes.push({
      name: "azure-blob-storage",
      status: "unhealthy",
      reason: "AZURE_STORAGE_CONNECTION_STRING is missing"
    });
  }

  if (configured.cosmos) {
    probes.push(withTimeout("cosmos-assets-container", getCosmosAssetsContainer().read()));
    probes.push(withTimeout("cosmos-users-container", getCosmosUsersContainer().read()));
  } else {
    probes.push({
      name: "cosmos-assets-container",
      status: "unhealthy",
      reason: "COSMOS_ENDPOINT or COSMOS_KEY is missing"
    });
    probes.push({
      name: "cosmos-users-container",
      status: "unhealthy",
      reason: "COSMOS_ENDPOINT or COSMOS_KEY is missing"
    });
  }

  const results = await Promise.all(probes);
  const healthy = results.every((probe) => probe.status === "healthy");

  return {
    status: healthy ? "ready" : "not_ready",
    healthy,
    dependencies: results
  };
}

module.exports = {
  dependencyConfigured,
  probeDependencies
};
