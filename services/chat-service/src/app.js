const express = require("express");
const cors = require("cors");
const path = require("path");
const env = require("./config/env");
const chatRoutes = require("./routes/chat.routes");
const uploadRoutes = require("./routes/upload.routes");
const rateLimiter = require("./middlewares/rateLimiter");
const errorHandler = require("./middlewares/errorHandler");

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(rateLimiter);
  app.use("/uploads", express.static(path.resolve(env.upload.path)));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "chat-service" });
  });

  app.use("/chat", chatRoutes);
  app.use("/chat", uploadRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/chat", uploadRoutes);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
