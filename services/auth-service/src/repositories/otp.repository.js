const redis = require("../config/redis");

function registerOtpKey(email) {
  return `otp:register:${email}`;
}

function resetOtpKey(email) {
  return `otp:reset:${email}`;
}

async function setJson(key, value, ttlSeconds) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

async function getJson(key) {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

async function updateJson(key, value, fallbackTtlSeconds) {
  const ttl = await redis.ttl(key);
  const ttlSeconds = ttl > 0 ? ttl : fallbackTtlSeconds;
  await setJson(key, value, ttlSeconds);
}

async function setRegisterOtp(email, value, ttlSeconds) {
  await setJson(registerOtpKey(email), value, ttlSeconds);
}

async function getRegisterOtp(email) {
  return getJson(registerOtpKey(email));
}

async function updateRegisterOtp(email, value, fallbackTtlSeconds) {
  await updateJson(registerOtpKey(email), value, fallbackTtlSeconds);
}

async function deleteRegisterOtp(email) {
  await redis.del(registerOtpKey(email));
}

async function setResetOtp(email, value, ttlSeconds) {
  await setJson(resetOtpKey(email), value, ttlSeconds);
}

async function getResetOtp(email) {
  return getJson(resetOtpKey(email));
}

async function updateResetOtp(email, value, fallbackTtlSeconds) {
  await updateJson(resetOtpKey(email), value, fallbackTtlSeconds);
}

async function deleteResetOtp(email) {
  await redis.del(resetOtpKey(email));
}

module.exports = {
  setRegisterOtp,
  getRegisterOtp,
  updateRegisterOtp,
  deleteRegisterOtp,
  setResetOtp,
  getResetOtp,
  updateResetOtp,
  deleteResetOtp,
};
