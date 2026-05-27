const authService = require("./auth.service");
const registerService = require("./register.service");
const passwordService = require("./password.service");

async function register(payload) {
  return registerService.sendRegisterOtp(payload);
}

async function verifyRegister(payload) {
  return registerService.verifyRegisterOtp(payload);
}

async function login(payload) {
  return authService.login(payload);
}

async function refresh(refreshToken) {
  return authService.refresh(refreshToken);
}

async function logout(userId) {
  return authService.logout(userId);
}

async function verifyAccessToken(token) {
  return authService.verifyToken(token);
}

async function forgotPassword(email) {
  return passwordService.sendResetOtp(email);
}

async function resetPassword(payload) {
  return passwordService.verifyResetOtp(payload);
}

async function changePassword(payload) {
  return passwordService.changePassword(payload);
}

module.exports = {
  register,
  verifyRegister,
  login,
  refresh,
  logout,
  verifyAccessToken,
  forgotPassword,
  resetPassword,
  changePassword,
};
