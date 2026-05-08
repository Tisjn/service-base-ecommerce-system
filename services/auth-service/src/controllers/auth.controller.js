const authService = require("../services/auth.service");
const registerService = require("../services/register.service");
const passwordService = require("../services/password.service");
const { verifyAccessToken } = require("../utils/jwt.utils");
const AppError = require("../utils/httpError");

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const register = asyncHandler(async (req, res) => {
  const result = await registerService.sendRegisterOtp(req.body);
  res.status(200).json(result);
});

const verifyRegister = asyncHandler(async (req, res) => {
  const result = await registerService.verifyRegisterOtp(req.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await passwordService.sendResetOtp(req.body.email);
  res.status(200).json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await passwordService.verifyResetOtp(req.body);
  res.status(200).json(result);
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  res.status(200).json(result);
});

const logout = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    throw new AppError(401, "Thiếu access token");
  }

  const payload = verifyAccessToken(token);
  const result = await authService.logout(payload.userId);
  res.status(200).json(result);
});

const verify = asyncHandler(async (req, res) => {
  const token =
    req.body.token ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new AppError(401, "Thiếu token");
  }

  const result = await authService.verifyToken(token);
  res.status(200).json(result);
});

module.exports = {
  register,
  verifyRegister,
  login,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  verify,
};
