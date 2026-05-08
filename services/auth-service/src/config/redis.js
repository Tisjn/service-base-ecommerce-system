const Redis = require("ioredis");
const env = require("./env");
const logger = require("../utils/logger");

const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  db: env.redis.db,
  lazyConnect: false,
  maxRetriesPerRequest: 3,
});

redis.on("error", (error) => {
  logger.error("Redis error", error);
});

module.exports = redis;
