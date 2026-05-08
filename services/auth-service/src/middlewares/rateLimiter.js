const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const registerLimiter = rateLimit({
  windowMs: env.limits.registerWindowMs,
  max: env.limits.registerMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
});

const loginLimiter = rateLimit({
  windowMs: env.limits.loginWindowMs,
  max: env.limits.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau." },
});

const passwordLimiter = rateLimit({
  windowMs: env.limits.passwordWindowMs,
  max: env.limits.passwordMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Quá nhiều yêu cầu OTP. Vui lòng thử lại sau." },
});

module.exports = {
  registerLimiter,
  loginLimiter,
  passwordLimiter,
};
