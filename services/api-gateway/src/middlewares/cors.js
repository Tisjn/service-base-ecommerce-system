const cors = require("cors");
const { config } = require("../config/routes.config");

const defaultOrigins = [config.frontendUrl, "http://localhost:5173", "http://127.0.0.1:5173"];

function normalizeOrigin(origin) {
  return String(origin || "").trim().replace(/\/+$/, "");
}

const allowedOrigins = Array.from(new Set([
  ...defaultOrigins,
  ...(process.env.CORS_ORIGINS || "")
    .split(","),
]
  .map(normalizeOrigin)
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
    const requestOrigin = normalizeOrigin(origin);

    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(requestOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
});
