import express from "express";

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "HyMedia Backend API",
    status: "healthy",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

export default router;