const express = require("express");

const authRoutes = require("./routes/auth.routes");
const errorHandler = require("./middlewares/errorHandler");

function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
