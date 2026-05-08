const env = require("../config/env");
const userRepository = require("../repositories/user.repository");
const otpRepository = require("../repositories/otp.repository");
const tokenRepository = require("../repositories/token.repository");
const { generateOTP } = require("../utils/otp.utils");
const { hashPassword } = require("../utils/hash.utils");
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

module.exports = {
  sendResetOtp,
  verifyResetOtp,
};
