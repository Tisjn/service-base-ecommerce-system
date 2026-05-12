const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const errorHandler = require("./middlewares/errorHandler");

function createApp() {
  const app = express();

  const uploadsDir = path.join(__dirname, "../uploads");
  const avatarUploadsDir = path.join(uploadsDir, "avatars");
  fs.mkdirSync(avatarUploadsDir, { recursive: true });

  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRoutes);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
