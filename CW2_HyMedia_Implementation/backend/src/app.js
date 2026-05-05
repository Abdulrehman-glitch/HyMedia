import express from "express";
import cors from "cors";
import morgan from "morgan";

import { env, isProduction } from "./config/env.js";
import healthRoutes from "./routes/healthRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(morgan(isProduction ? "combined" : "dev"));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "HyMedia Backend API is running.",
    documentation: "/api/v1/health",
    apiBase: "/api/v1",
    availableEndpoints: [
      "GET /api/v1/health",
      "GET /api/v1/assets",
      "GET /api/v1/assets/stats",
      "GET /api/v1/assets/upload-rules",
      "GET /api/v1/assets/:assetId",
      "POST /api/v1/assets",
      "POST /api/v1/assets/upload",
      "PUT /api/v1/assets/:assetId",
      "DELETE /api/v1/assets/:assetId"
    ],
    timestamp: new Date().toISOString()
  });
});

app.use("/api/v1", healthRoutes);
app.use("/api/v1", assetRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
