require("dotenv").config();

const setupApplicationInsights = require("./src/config/applicationInsights");
setupApplicationInsights();

const express = require("express");
const cors = require("cors");

const assetRoutes = require("./src/routes/assets.routes");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    application: "HyMedia Cloud-Native Multimedia Sharing Platform",
    status: "running",
    version: "1.0.0",
    module: "COM682 Cloud Native Development",
    student: "B00968573",
    cloudServices: [
      "Azure App Service",
      "Azure Blob Storage",
      "Azure Cosmos DB for NoSQL",
      "Azure Application Insights"
    ]
  });
});

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "hymedia-backend-api",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    azureStorageConfigured: Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING),
    cosmosConfigured: Boolean(process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY),
    appInsightsConfigured: Boolean(process.env.APPINSIGHTS_CONNECTION_STRING)
  });
});

app.use("/api/v1/assets", assetRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    requestedUrl: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`HyMedia backend API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});