const cors = require("cors");
const { config } = require("../config/routes.config");

const defaultOrigins = [config.frontendUrl, "http://127.0.0.1:5173"];

const allowedOrigins = Array.from(new Set((process.env.CORS_ORIGINS || defaultOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .flatMap((origin) => {
    if (origin === "http://localhost:5173") {
      return [origin, "http://127.0.0.1:5173"];
    }
    if (origin === "http://127.0.0.1:5173") {
      return [origin, "http://localhost:5173"];
    }
    return [origin];
  })));

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
