const userRepository = require("../repositories/user.repository");
const otpService = require("./otp.service");
const passwordEncoder = require("./passwordEncoder.service");
const refreshTokenService = require("./refreshToken.service");
const AppError = require("../utils/httpError");

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

async function sendResetOtp(email) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(404, "Email khong ton tai");
  }

  await otpService.createResetOtp(normalizedEmail);

  return {
    message: "OTP da duoc gui",
  };
}

async function verifyResetOtp({ email, otp, newPassword }) {
  const normalizedEmail = normalizeEmail(email);
  await otpService.verifyResetOtp(normalizedEmail, otp);

  const updated = await userRepository.updatePassword(
    normalizedEmail,
    await passwordEncoder.hash(newPassword),
  );

  if (!updated) {
    throw new AppError(500, "Khong the cap nhat mat khau");
  }

  const updatedUser = await userRepository.findByEmail(normalizedEmail);
  if (updatedUser) {
    await refreshTokenService.revokeByUserId(updatedUser.id);
  }

  await otpService.deleteResetOtp(normalizedEmail);

  return {
    message: "Doi mat khau thanh cong, vui long dang nhap lai",
  };
}

async function changePassword({ userId, currentPassword, otp, newPassword }) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(404, "Nguoi dung khong ton tai");
  }

  const validPassword = await passwordEncoder.matches(
    currentPassword,
    user.password,
  );
  if (!validPassword) {
    throw new AppError(400, "Mat khau hien tai khong dung");
  }

  const samePassword = await passwordEncoder.matches(newPassword, user.password);
  if (samePassword) {
    throw new AppError(400, "Mat khau moi phai khac mat khau hien tai");
  }

  const normalizedEmail = normalizeEmail(user.email);
  await otpService.verifyResetOtp(normalizedEmail, otp);

  const updated = await userRepository.updatePasswordById(
    userId,
    await passwordEncoder.hash(newPassword),
  );
  if (!updated) {
    throw new AppError(500, "Khong the cap nhat mat khau");
  }

  await refreshTokenService.revokeByUserId(userId);
  await otpService.deleteResetOtp(normalizedEmail);

  return {
    message: "Doi mat khau thanh cong. Vui long dang nhap lai.",
  };
}

module.exports = {
  sendResetOtp,
  verifyResetOtp,
  changePassword,
};
