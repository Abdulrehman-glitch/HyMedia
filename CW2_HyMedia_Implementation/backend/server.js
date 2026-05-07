require("dotenv").config();

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
    student: "B00968573"
  });
});

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "hymedia-backend-api",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
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