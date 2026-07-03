require("dotenv").config();

const setupApplicationInsights = require("./src/config/applicationInsights");
setupApplicationInsights();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const assetRoutes = require("./src/routes/assets.routes");
const authRoutes = require("./src/routes/auth.routes");
const { generalLimiter } = require("./src/middleware/rate-limit.middleware");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://hymedia-web.azurewebsites.net"
];

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked: origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Range"],
    exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length", "Content-Type"]
  })
);

app.use(generalLimiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    application: "HyMedia Cloud-Native Multimedia Sharing Platform",
    status: "running",
    version: "1.1.0",
    module: "COM682 Cloud Native Development",
    student: "B00968573",
    frontend: "https://hymedia-web.azurewebsites.net",
    cloudServices: [
      "Azure App Service",
      "Azure Blob Storage",
      "Azure Cosmos DB for NoSQL",
      "Azure Application Insights"
    ],
    endpoints: {
      health: "/api/v1/health",
      authSignup: "/api/v1/auth/signup",
      authLogin: "/api/v1/auth/login",
      assets: "/api/v1/assets"
    }
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
    usersContainerConfigured: Boolean(process.env.COSMOS_USERS_CONTAINER_NAME || "users"),
    appInsightsConfigured: Boolean(process.env.APPINSIGHTS_CONNECTION_STRING)
  });
});

app.use("/api/v1/auth", authRoutes);
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
});
