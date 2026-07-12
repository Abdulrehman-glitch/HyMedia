function statusCodeFor(error) {
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
    return error.status;
  }

  if (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600) {
    return error.statusCode;
  }

  return 500;
}

function codeFor(error, statusCode) {
  if (error.code && typeof error.code === "string") {
    return error.code;
  }

  if (statusCode === 400) return "BAD_REQUEST";
  if (statusCode === 401) return "UNAUTHENTICATED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 409) return "CONFLICT";
  if (statusCode === 413) return "PAYLOAD_TOO_LARGE";
  if (statusCode === 415) return "UNSUPPORTED_MEDIA_TYPE";
  if (statusCode === 423) return "ACCOUNT_LOCKED";
  if (statusCode === 429) return "RATE_LIMITED";

  return "INTERNAL_SERVER_ERROR";
}

function errorMiddleware(err, req, res, next) {
  const statusCode = statusCodeFor(err);
  const code = codeFor(err, statusCode);
  const isServerError = statusCode >= 500;
  const message = isServerError && process.env.NODE_ENV === "production"
    ? "Internal server error."
    : err.message || "Internal server error.";

  const log = {
    level: isServerError ? "error" : "warn",
    requestId: req.requestId,
    code,
    statusCode,
    method: req.method,
    path: req.originalUrl,
    message: err.message
  };

  if (isServerError) {
    log.stack = err.stack;
  }

  console[isServerError ? "error" : "warn"](JSON.stringify(log));

  return res.status(statusCode).json({
    success: false,
    code,
    message,
    requestId: req.requestId
  });
}

module.exports = errorMiddleware;
