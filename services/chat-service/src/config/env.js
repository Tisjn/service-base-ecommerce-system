const dotenv = require("dotenv");

dotenv.config();

function read(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function toInt(name, fallback) {
  const raw = read(name, fallback);
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be an integer`);
  }
  return parsed;
}

const env = {
  port: toInt("PORT", 3008),
  nodeEnv: read("NODE_ENV", "development"),
  frontendUrl: read("FRONTEND_URL", "http://localhost:5173"),
  jwtSecret: read("JWT_SECRET", ""),
  aws: {
    region: read("AWS_REGION", read("REGION", "us-east-1")),
    accessKeyId: read("AWS_ACCESS_KEY_ID", read("ACCESS_KEY", "")),
    secretAccessKey: read("AWS_SECRET_ACCESS_KEY", read("SECRET_KEY", "")),
  },
  dynamo: {
    roomsTable: read("DDB_CHAT_ROOMS_TABLE", "chat_rooms"),
    messagesTable: read("DDB_CHAT_MESSAGES_TABLE", "chat_messages"),
  },
  upload: {
    path: read("UPLOAD_PATH", "./uploads"),
    maxFileSize: toInt("MAX_FILE_SIZE", 5 * 1024 * 1024),
    allowedImageTypes: read(
      "ALLOWED_IMAGE_TYPES",
      "image/jpeg,image/png,image/gif,image/webp",
    ).split(","),
    allowedFileTypes: read(
      "ALLOWED_FILE_TYPES",
      "application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ).split(","),
  },
};

if (!env.jwtSecret || env.jwtSecret.length < 16) {
  throw new Error("JWT_SECRET is required for chat-service");
}

module.exports = env;
