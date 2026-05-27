const authApplicationService = require("../services/authApplication.service");
const profileService = require("../services/profile.service");
const AppError = require("../utils/httpError");

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const register = asyncHandler(async (req, res) => {
  const result = await authApplicationService.register(req.body);
  res.status(200).json(result);
});

const verifyRegister = asyncHandler(async (req, res) => {
  const result = await authApplicationService.verifyRegister(req.body);
  res.status(201).json(result);
});

const uploadAvatar = asyncHandler(async (req, res) => {
  const result = await profileService.uploadAvatar(req.file);
  res.status(200).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authApplicationService.login(req.body);
  res.status(200).json(result);
});

const getProfile = asyncHandler(async (req, res) => {
  const user = await profileService.getProfile(req.user.userId);
  res.status(200).json(user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await profileService.updateProfile(req.user.userId, req.body);
  res.status(200).json(user);
});

const updateProfileAvatar = asyncHandler(async (req, res) => {
  const user = await profileService.updateProfileAvatar(req.user.userId, req.file);
  res.status(200).json(user);
});

const deleteProfileAvatar = asyncHandler(async (req, res) => {
  const user = await profileService.deleteProfileAvatar(req.user.userId);
  res.status(200).json(user);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authApplicationService.forgotPassword(req.body.email);
  res.status(200).json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authApplicationService.resetPassword(req.body);
  res.status(200).json(result);
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authApplicationService.changePassword({
    userId: req.user.userId,
    currentPassword: req.body.currentPassword,
    otp: req.body.otp,
    newPassword: req.body.newPassword,
  });
  res.status(200).json(result);
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authApplicationService.refresh(req.body.refreshToken);
  res.status(200).json(result);
});

const logout = asyncHandler(async (req, res) => {
  const result = await authApplicationService.logout(req.user.userId);
  res.status(200).json(result);
});

const verify = asyncHandler(async (req, res) => {
  const token =
    req.body.token ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new AppError(401, "Thieu token");
  }

  const result = await authApplicationService.verifyAccessToken(token);
  res.status(200).json(result);
});

module.exports = {
  register,
  verifyRegister,
  uploadAvatar,
  login,
  getProfile,
  updateProfile,
  updateProfileAvatar,
  deleteProfileAvatar,
  forgotPassword,
  resetPassword,
  changePassword,
  refresh,
  logout,
  verify,
};
