const cors = require("cors");
const { config } = require("../config/routes.config");

const allowedOrigins = (process.env.CORS_ORIGINS || config.frontendUrl)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
});
