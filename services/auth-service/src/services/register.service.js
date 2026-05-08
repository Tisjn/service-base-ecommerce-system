const env = require("../config/env");
const userRepository = require("../repositories/user.repository");
const otpRepository = require("../repositories/otp.repository");
const { generateOTP } = require("../utils/otp.utils");
const { hashPassword } = require("../utils/hash.utils");
const { sendOtpEmail } = require("../utils/mailer.utils");
const AppError = require("../utils/httpError");

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

async function sendRegisterOtp({ email, password, fullName }) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await userRepository.findByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError(409, "Email đã tồn tại");
  }

  const hashedPassword = await hashPassword(password);
  const otp = generateOTP();

  await otpRepository.setRegisterOtp(
    normalizedEmail,
    {
      otp,
      hashedPassword,
      fullName: String(fullName).trim(),
      attempts: 0,
    },
    env.otp.ttlSeconds,
  );

  await sendOtpEmail(normalizedEmail, otp, "register", fullName);

  return {
    message: "OTP đã được gửi đến email của bạn",
  };
}

async function verifyRegisterOtp({ email, otp }) {
  const normalizedEmail = normalizeEmail(email);
  const otpData = await otpRepository.getRegisterOtp(normalizedEmail);

  if (!otpData) {
    throw new AppError(400, "OTP đã hết hạn hoặc không tồn tại");
  }

  if (String(otpData.otp) !== String(otp)) {
    const nextAttempts = (otpData.attempts || 0) + 1;

    if (nextAttempts >= env.otp.maxAttempts) {
      await otpRepository.deleteRegisterOtp(normalizedEmail);
      throw new AppError(429, "OTP sai quá 3 lần. Vui lòng gửi lại OTP");
    }

    await otpRepository.updateRegisterOtp(
      normalizedEmail,
      {
        ...otpData,
        attempts: nextAttempts,
      },
      env.otp.ttlSeconds,
    );

    throw new AppError(400, "OTP không đúng");
  }

  const existed = await userRepository.findByEmail(normalizedEmail);
  if (existed) {
    await otpRepository.deleteRegisterOtp(normalizedEmail);
    throw new AppError(409, "Email đã tồn tại");
  }

  await userRepository.createUser({
    email: normalizedEmail,
    password: otpData.hashedPassword,
    fullName: otpData.fullName,
    role: "customer",
    status: "active",
  });

  await otpRepository.deleteRegisterOtp(normalizedEmail);

  return {
    message: "Đăng ký thành công",
  };
}

module.exports = {
  sendRegisterOtp,
  verifyRegisterOtp,
};
