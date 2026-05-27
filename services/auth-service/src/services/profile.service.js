const userRepository = require("../repositories/user.repository");
const avatarService = require("./avatar.service");
const AppError = require("../utils/httpError");

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl || null,
  };
}

async function getProfile(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(404, "Nguoi dung khong ton tai");
  }

  return toPublicUser(user);
}

async function updateProfile(userId, { fullName }) {
  const normalizedFullName = String(fullName || "").trim();
  if (!normalizedFullName) {
    throw new AppError(400, "Ho ten khong duoc de trong");
  }

  const user = await userRepository.updateProfile(userId, {
    fullName: normalizedFullName,
  });
  if (!user) {
    throw new AppError(404, "Nguoi dung khong ton tai");
  }

  return toPublicUser(user);
}

async function uploadAvatar(file) {
  const { avatarUrl } = await avatarService.uploadAvatar(file);
  return { avatarUrl };
}

async function updateProfileAvatar(userId, file) {
  const existingUser = await userRepository.findById(userId);
  if (!existingUser) {
    throw new AppError(404, "Nguoi dung khong ton tai");
  }

  const { avatarUrl } = await avatarService.uploadAvatar(file);
  const user = await userRepository.updateAvatarUrl(userId, avatarUrl);
  await avatarService.deleteAvatar(existingUser.avatarUrl);

  return toPublicUser(user);
}

async function deleteProfileAvatar(userId) {
  const existingUser = await userRepository.findById(userId);
  if (!existingUser) {
    throw new AppError(404, "Nguoi dung khong ton tai");
  }

  const user = await userRepository.updateAvatarUrl(userId, null);
  await avatarService.deleteAvatar(existingUser.avatarUrl);

  return toPublicUser(user);
}

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  updateProfileAvatar,
  deleteProfileAvatar,
};
