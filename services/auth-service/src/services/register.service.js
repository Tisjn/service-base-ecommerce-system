const userRepository = require("../repositories/user.repository");
const otpService = require("./otp.service");
const passwordEncoder = require("./passwordEncoder.service");
const AppError = require("../utils/httpError");

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

async function sendRegisterOtp({ email, password, fullName, avatarUrl }) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await userRepository.findByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError(409, "Email da ton tai");
  }

  await otpService.createRegisterOtp(normalizedEmail, {
    hashedPassword: await passwordEncoder.hash(password),
    fullName: String(fullName).trim(),
    avatarUrl: avatarUrl ? String(avatarUrl).trim() : null,
  });

  return {
    message: "OTP da duoc gui den email cua ban",
  };
}

async function verifyRegisterOtp({ email, otp }) {
  const normalizedEmail = normalizeEmail(email);
  const otpData = await otpService.verifyRegisterOtp(normalizedEmail, otp);

  const existed = await userRepository.findByEmail(normalizedEmail);
  if (existed) {
    await otpService.deleteRegisterOtp(normalizedEmail);
    throw new AppError(409, "Email da ton tai");
  }

  await userRepository.createUser({
    email: normalizedEmail,
    password: otpData.hashedPassword,
    fullName: otpData.fullName,
    avatarUrl: otpData.avatarUrl || null,
    role: "customer",
    status: "active",
  });

  await otpService.deleteRegisterOtp(normalizedEmail);

  return {
    message: "Dang ky thanh cong",
  };
}

module.exports = {
  sendRegisterOtp,
  verifyRegisterOtp,
};
