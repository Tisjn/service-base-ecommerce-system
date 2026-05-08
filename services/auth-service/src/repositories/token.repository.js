const redis = require("../config/redis");

function refreshTokenKey(userId) {
  return `refresh:${userId}`;
}

async function setRefreshToken(userId, token, ttlSeconds) {
  await redis.set(refreshTokenKey(userId), token, "EX", ttlSeconds);
}

async function getRefreshToken(userId) {
  return redis.get(refreshTokenKey(userId));
}

async function deleteRefreshToken(userId) {
  await redis.del(refreshTokenKey(userId));
}

module.exports = {
  setRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
};
