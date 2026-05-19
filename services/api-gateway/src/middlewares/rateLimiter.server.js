const rateLimit = require("express-rate-limit");

module.exports = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 1_000),
  skip(req) {
    return (
      req.method === "OPTIONS" ||
      req.path === "/health" ||
      req.path.startsWith("/socket.io")
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
});
