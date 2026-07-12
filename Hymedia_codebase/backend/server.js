require("dotenv").config();

const setupApplicationInsights = require("./src/config/applicationInsights");
setupApplicationInsights();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const assetRoutes = require("./src/routes/assets.routes");
const authRoutes = require("./src/routes/auth.routes");
const moderationRoutes = require("./src/routes/moderation.routes");
const adminRoutes = require("./src/routes/admin.routes");
const { generalLimiter } = require("./src/middleware/rate-limit.middleware");
const requestContext = require("./src/middleware/request-context.middleware");
const errorMiddleware = require("./src/middleware/error.middleware");
const { dependencyConfigured, probeDependencies } = require("./src/services/health.service");
const packageJson = require("./package.json");

const app = express();
const PORT = process.env.PORT || 5000;

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://hymedia-web.azurewebsites.net"
];
const allowedOrigins = (process.env.CORS_ORIGINS || defaultAllowedOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'none'"]
      }
    }
  })
);

app.use(requestContext);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked: origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Range", "X-Request-Id"],
    exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length", "Content-Type", "X-Request-Id"]
  })
);

app.use(generalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    application: "HyMedia Cloud-Native Multimedia Sharing Platform",
    status: "running",
    version: packageJson.version,
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
      liveness: "/api/v1/live",
      readiness: "/api/v1/ready",
      authSignup: "/api/v1/auth/signup",
      authLogin: "/api/v1/auth/login",
      assets: "/api/v1/assets"
    }
  });
});

app.get("/api/v1/live", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "hymedia-backend-api",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: packageJson.version,
    environment: process.env.NODE_ENV || "development"
  });
});

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "hymedia-backend-api",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: packageJson.version,
    environment: process.env.NODE_ENV || "development",
    configured: dependencyConfigured()
  });
});

app.get("/api/v1/ready", async (req, res, next) => {
  try {
    const readiness = await probeDependencies();

    res.status(readiness.healthy ? 200 : 503).json({
      success: readiness.healthy,
      service: "hymedia-backend-api",
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      ...readiness
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/openapi.json", (req, res) => {
  res.status(200).json({
    openapi: "3.1.0",
    info: {
      title: "HyMedia API",
      version: packageJson.version
    },
    servers: [{ url: "/api/v1" }],
    paths: {
      "/health": { get: { summary: "Liveness/configuration health." } },
      "/ready": { get: { summary: "Dependency readiness probe." } },
      "/auth/signup": { post: { summary: "Create an account and issue auth cookies." } },
      "/auth/login": { post: { summary: "Sign in and issue auth cookies." } },
      "/auth/refresh": { post: { summary: "Rotate refresh session and renew access cookie." } },
      "/auth/logout": { post: { summary: "Revoke current refresh session." } },
      "/auth/me": { get: { summary: "Return current authenticated user." } },
      "/auth/sessions": { get: { summary: "List current user's sessions/devices." } },
      "/auth/sessions/{sessionId}": { delete: { summary: "Revoke one user session." } },
      "/auth/export": { get: { summary: "Export account data for portability/privacy requests." } },
      "/auth/account": { delete: { summary: "Delete the current account and revoke sessions." } },
      "/assets": {
        get: { summary: "List assets visible to the current user." },
        post: { summary: "Create authenticated metadata-only asset." }
      },
      "/assets/upload": { post: { summary: "Upload media and create asset metadata." } },
      "/assets/recycle-bin": { get: { summary: "List deleted assets owned by the current user." } },
      "/assets/share/{token}/media": { get: { summary: "Stream media using an active expiring share link." } },
      "/assets/{assetId}": {
        get: { summary: "Get one asset if visible to the current user." },
        put: { summary: "Update owner-managed asset fields." },
        delete: { summary: "Move an owned asset to the recycle bin." }
      },
      "/assets/{assetId}/media": { get: { summary: "Stream authorised asset media with Range support." } },
      "/assets/{assetId}/share-links": {
        get: { summary: "List active and revoked share links for an owned asset." },
        post: { summary: "Create an expiring share link for an owned asset." }
      },
      "/assets/{assetId}/restore": { post: { summary: "Restore an asset from the recycle bin." } },
      "/assets/{assetId}/purge": { delete: { summary: "Permanently delete recycled metadata and blob media." } },
      "/assets/share-links/{shareId}": { delete: { summary: "Revoke one share link." } },
      "/assets/{assetId}/report": { post: { summary: "Report visible media for moderation." } },
      "/moderation/queue": { get: { summary: "Moderator queue for reported/quarantined assets." } },
      "/moderation/{assetId}/decision": { post: { summary: "Apply a moderator decision." } },
      "/admin/users": { get: { summary: "List user accounts." } },
      "/admin/users/{userId}/role": { put: { summary: "Update user role." } }
    }
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/assets", assetRoutes);
app.use("/api/v1/moderation", moderationRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: "Endpoint not found.",
    requestId: req.requestId,
    requestedUrl: req.originalUrl
  });
});

app.use(errorMiddleware);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`HyMedia backend API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
