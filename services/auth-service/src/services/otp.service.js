const crypto = require("crypto");

const env = require("../config/env");
const otpRepository = require("../repositories/otp.repository");
const { sendOtpEmail } = require("../utils/mailer.utils");
const AppError = require("../utils/httpError");

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function createRegisterOtp(email, payload) {
  const otp = generateOtp();
  await otpRepository.setRegisterOtp(
    email,
    {
      ...payload,
      otp,
      attempts: 0,
    },
    env.otp.ttlSeconds,
  );
  await sendOtpEmail(email, otp, "register", payload.fullName);
}

async function createResetOtp(email) {
  const otp = generateOtp();
  await otpRepository.setResetOtp(
    email,
    {
      otp,
      attempts: 0,
    },
    env.otp.ttlSeconds,
  );
  await sendOtpEmail(email, otp, "reset");
}

async function verifyRegisterOtp(email, otp) {
  return verifyOtp({
    otp,
    load: () => otpRepository.getRegisterOtp(email),
    update: (value) =>
      otpRepository.updateRegisterOtp(email, value, env.otp.ttlSeconds),
    remove: () => otpRepository.deleteRegisterOtp(email),
  });
}

async function verifyResetOtp(email, otp) {
  return verifyOtp({
    otp,
    load: () => otpRepository.getResetOtp(email),
    update: (value) =>
      otpRepository.updateResetOtp(email, value, env.otp.ttlSeconds),
    remove: () => otpRepository.deleteResetOtp(email),
  });
}

async function deleteRegisterOtp(email) {
  await otpRepository.deleteRegisterOtp(email);
}

async function deleteResetOtp(email) {
  await otpRepository.deleteResetOtp(email);
}

async function verifyOtp({ otp, load, update, remove }) {
  const otpData = await load();

  if (!otpData) {
    throw new AppError(400, "OTP da het han hoac khong ton tai");
  }

  if (String(otpData.otp) !== String(otp)) {
    const nextAttempts = (otpData.attempts || 0) + 1;

    if (nextAttempts >= env.otp.maxAttempts) {
      await remove();
      throw new AppError(429, "OTP sai qua nhieu lan. Vui long gui lai OTP");
    }

    await update({
      ...otpData,
      attempts: nextAttempts,
    });

    throw new AppError(400, "OTP khong dung");
  }

  return otpData;
}

module.exports = {
  createRegisterOtp,
  createResetOtp,
  verifyRegisterOtp,
  verifyResetOtp,
  deleteRegisterOtp,
  deleteResetOtp,
};
