const logger = require("../utils/logger");

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  if (statusCode >= 500) {
    logger.error(error);
  }

  return res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
