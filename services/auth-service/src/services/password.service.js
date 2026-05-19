const env = require("../config/env");
const userRepository = require("../repositories/user.repository");
const otpRepository = require("../repositories/otp.repository");
const tokenRepository = require("../repositories/token.repository");
const { generateOTP } = require("../utils/otp.utils");
const { comparePassword, hashPassword } = require("../utils/hash.utils");
const { sendOtpEmail } = require("../utils/mailer.utils");
const AppError = require("../utils/httpError");

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

async function sendResetOtp(email) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(404, "Email không tồn tại");
  }

  const otp = generateOTP();

  await otpRepository.setResetOtp(
    normalizedEmail,
    {
      otp,
      attempts: 0,
    },
    env.otp.ttlSeconds,
  );

  await sendOtpEmail(normalizedEmail, otp, "reset");

  return {
    message: "OTP đã được gửi",
  };
}

async function verifyResetOtp({ email, otp, newPassword }) {
  const normalizedEmail = normalizeEmail(email);
  const otpData = await otpRepository.getResetOtp(normalizedEmail);

  if (!otpData) {
    throw new AppError(400, "OTP đã hết hạn hoặc không tồn tại");
  }

  if (String(otpData.otp) !== String(otp)) {
    const nextAttempts = (otpData.attempts || 0) + 1;

    if (nextAttempts >= env.otp.maxAttempts) {
      await otpRepository.deleteResetOtp(normalizedEmail);
      throw new AppError(429, "OTP sai quá 3 lần. Vui lòng gửi lại OTP");
    }

    await otpRepository.updateResetOtp(
      normalizedEmail,
      {
        ...otpData,
        attempts: nextAttempts,
      },
      env.otp.ttlSeconds,
    );

    throw new AppError(400, "OTP không đúng");
  }

  const hashedPassword = await hashPassword(newPassword);
  const updated = await userRepository.updatePassword(
    normalizedEmail,
    hashedPassword,
  );

  if (!updated) {
    throw new AppError(500, "Không thể cập nhật mật khẩu");
  }

  const updatedUser = await userRepository.findByEmail(normalizedEmail);
  if (updatedUser) {
    await tokenRepository.deleteRefreshToken(updatedUser.id);
  }

  await otpRepository.deleteResetOtp(normalizedEmail);

  return {
    message: "Đổi mật khẩu thành công, vui lòng đăng nhập lại",
  };
}

async function changePassword({ userId, currentPassword, otp, newPassword }) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(404, "Nguoi dung khong ton tai");
  }

  const validPassword = await comparePassword(currentPassword, user.password);
  if (!validPassword) {
    throw new AppError(400, "Mat khau hien tai khong dung");
  }

  const samePassword = await comparePassword(newPassword, user.password);
  if (samePassword) {
    throw new AppError(400, "Mat khau moi phai khac mat khau hien tai");
  }

  const otpData = await otpRepository.getResetOtp(normalizeEmail(user.email));
  if (!otpData) {
    throw new AppError(400, "OTP đã hết hạn hoặc không tồn tại");
  }

  if (String(otpData.otp) !== String(otp)) {
    const nextAttempts = (otpData.attempts || 0) + 1;
    if (nextAttempts >= env.otp.maxAttempts) {
      await otpRepository.deleteResetOtp(normalizeEmail(user.email));
      throw new AppError(429, "OTP sai quá 3 lần. Vui lòng gửi lại OTP");
    }

    await otpRepository.updateResetOtp(
      normalizeEmail(user.email),
      {
        ...otpData,
        attempts: nextAttempts,
      },
      env.otp.ttlSeconds,
    );
    throw new AppError(400, "OTP không đúng");
  }

  const hashedPassword = await hashPassword(newPassword);
  const updated = await userRepository.updatePasswordById(
    userId,
    hashedPassword,
  );
  if (!updated) {
    throw new AppError(500, "Khong the cap nhat mat khau");
  }

  await tokenRepository.deleteRefreshToken(userId);
  await otpRepository.deleteResetOtp(normalizeEmail(user.email));

  return {
    message: "Doi mat khau thanh cong. Vui long dang nhap lai.",
  };
}

module.exports = {
  sendResetOtp,
  verifyResetOtp,
  changePassword,
};
