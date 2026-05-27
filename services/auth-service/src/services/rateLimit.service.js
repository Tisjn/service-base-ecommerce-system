const rateLimit = require("express-rate-limit");

const env = require("../config/env");

function createRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });
}

const registerLimiter = createRateLimiter({
  windowMs: env.limits.registerWindowMs,
  max: env.limits.registerMax,
  message: "Qua nhieu yeu cau. Vui long thu lai sau.",
});

const loginLimiter = createRateLimiter({
  windowMs: env.limits.loginWindowMs,
  max: env.limits.loginMax,
  message: "Qua nhieu lan dang nhap. Vui long thu lai sau.",
});

const passwordLimiter = createRateLimiter({
  windowMs: env.limits.passwordWindowMs,
  max: env.limits.passwordMax,
  message: "Qua nhieu yeu cau OTP. Vui long thu lai sau.",
});

module.exports = {
  createRateLimiter,
  registerLimiter,
  loginLimiter,
  passwordLimiter,
};
