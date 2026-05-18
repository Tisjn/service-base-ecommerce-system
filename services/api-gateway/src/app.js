const express = require("express");
const corsMiddleware = require("./middlewares/cors");
const serverRateLimiter = require("./middlewares/rateLimiter.server");
const requestLogger = require("./middlewares/requestLogger");
const { setupProxyRoutes } = require("./proxy/proxyRouter");

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(corsMiddleware);
  app.use(serverRateLimiter);
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "api-gateway" });
  });

  setupProxyRoutes(app);

  app.use((req, res) => {
    res.status(404).json({
      error: "Route not found",
      path: req.originalUrl,
    });
  });

  return app;
}

module.exports = { createApp };
