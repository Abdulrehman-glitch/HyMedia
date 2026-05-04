import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: toNumber(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",

  azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || "",
  azureStorageContainerName: process.env.AZURE_STORAGE_CONTAINER_NAME || "media",

  cosmosEndpoint: process.env.COSMOS_ENDPOINT || "",
  cosmosKey: process.env.COSMOS_KEY || "",
  cosmosDatabaseId: process.env.COSMOS_DATABASE_ID || "hymedia_db",
  cosmosContainerId: process.env.COSMOS_CONTAINER_ID || "assets",

  applicationInsightsConnectionString:
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || ""
};

export const isProduction = env.nodeEnv === "production";