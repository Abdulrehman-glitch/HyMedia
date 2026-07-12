const crypto = require("crypto");

function requestContext(req, res, next) {
  const incomingRequestId = req.headers["x-request-id"];
  req.requestId = typeof incomingRequestId === "string" && incomingRequestId.trim()
    ? incomingRequestId.trim().slice(0, 120)
    : crypto.randomUUID();

  const startedAt = Date.now();
  res.setHeader("X-Request-Id", req.requestId);

  res.on("finish", () => {
    const log = {
      level: res.statusCode >= 500 ? "error" : "info",
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.userId || null
    };

    console.log(JSON.stringify(log));
  });

  next();
}

module.exports = requestContext;
