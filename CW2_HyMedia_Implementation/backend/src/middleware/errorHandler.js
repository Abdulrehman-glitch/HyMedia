export const notFoundHandler = (req, res, next) => {
  const error = new Error("Route not found: " + req.method + " " + req.originalUrl);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  console.error("API Error:", {
    message: error.message,
    statusCode,
    method: req.method,
    path: req.originalUrl,
    details: error.details,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  });

  const response = {
    success: false,
    message: statusCode === 500 ? "Internal server error" : error.message,
    statusCode,
    timestamp: new Date().toISOString()
  };

  if (error.details) {
    response.details = error.details;
  }

  res.status(statusCode).json(response);
};
