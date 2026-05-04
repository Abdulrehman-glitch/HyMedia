import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.port, () => {
  console.log("=========================================");
  console.log("HyMedia Backend API started successfully");
  console.log(`Environment: ${env.nodeEnv}`);
  console.log(`Local URL: http://localhost:${env.port}`);
  console.log(`Health: http://localhost:${env.port}/api/v1/health`);
  console.log("=========================================");
});

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down HyMedia Backend API...`);

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));