const dotenv = require("dotenv");

dotenv.config();

function requireEnv(name, fallback) {
  const raw = process.env[name];
  const value = raw === undefined || raw === "" ? fallback : raw;
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function toInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }

  return parsed;
}

function toBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  return raw.toLowerCase() === "true" || raw === "1";
}

const env = {
  port: toInt("PORT", 3001),
  db: {
    host: requireEnv("DB_HOST"),
    port: toInt("DB_PORT", 3306),
    name: requireEnv("DB_NAME"),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    ssl: toBool("DB_SSL", false),
    poolLimit: toInt("DB_POOL_LIMIT", 10),
  },
  redis: {
    host: requireEnv("REDIS_HOST", "localhost"),
    port: toInt("REDIS_PORT", 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: toInt("REDIS_DB", 0),
  },
  jwt: {
    secret: requireEnv("JWT_SECRET"),
    accessExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  },
  smtp: {
    host: requireEnv("SMTP_HOST"),
    port: toInt("SMTP_PORT", 587),
    secure: toBool("SMTP_SECURE", false),
    user: requireEnv("SMTP_USER"),
    pass: requireEnv("SMTP_PASS"),
  },
  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    bucket: requireEnv("AWS_S3_BUCKET"),
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
  otp: {
    ttlSeconds: toInt("OTP_TTL_SECONDS", 300),
    maxAttempts: toInt("OTP_MAX_ATTEMPTS", 3),
  },
  password: {
    saltRounds: toInt("PASSWORD_SALT_ROUNDS", 12),
  },
  limits: {
    registerWindowMs: toInt("REGISTER_RATE_LIMIT_WINDOW_MS", 60000),
    registerMax: toInt("REGISTER_RATE_LIMIT_MAX", 5),
    loginWindowMs: toInt("LOGIN_RATE_LIMIT_WINDOW_MS", 60000),
    loginMax: toInt("LOGIN_RATE_LIMIT_MAX", 5),
    passwordWindowMs: toInt("PASSWORD_RATE_LIMIT_WINDOW_MS", 60000),
    passwordMax: toInt("PASSWORD_RATE_LIMIT_MAX", 5),
  },
};

if (!env.jwt.secret || env.jwt.secret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long");
}

module.exports = env;
