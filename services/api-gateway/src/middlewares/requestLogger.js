const logger = require("../utils/logger");

module.exports = function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} ${Date.now() - startedAt}ms`,
    );
  });

  next();
};
