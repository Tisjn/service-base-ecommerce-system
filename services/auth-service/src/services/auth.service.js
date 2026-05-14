const userRepository = require("../repositories/user.repository");
const tokenRepository = require("../repositories/token.repository");
const { comparePassword } = require("../utils/hash.utils");
const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require("../utils/jwt.utils");
const AppError = require("../utils/httpError");

async function login({ email, password }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(401, "Email hoặc mật khẩu không đúng");
  }

  if (user.status !== "active") {
    throw new AppError(403, "Tài khoản chưa được xác minh OTP");
  }

  const validPassword = await comparePassword(password, user.password);
  if (!validPassword) {
    throw new AppError(401, "Email hoặc mật khẩu không đúng");
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await tokenRepository.setRefreshToken(
    user.id,
    refreshToken,
    60 * 60 * 24 * 7,
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl || null,
    },
  };
}

async function refresh(refreshToken) {
  const payload = verifyRefreshToken(refreshToken);
  const storedRefreshToken = await tokenRepository.getRefreshToken(
    payload.userId,
  );

  if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
    throw new AppError(401, "Refresh token không hợp lệ");
  }

  await tokenRepository.setRefreshToken(
    payload.userId,
    refreshToken,
    60 * 60 * 24 * 7,
  );

  return {
    accessToken: signAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    }),
  };
}

async function verifyToken(token) {
  const payload = verifyAccessToken(token);

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };
}

async function logout(userId) {
  await tokenRepository.deleteRefreshToken(userId);
  return { message: "Đăng xuất thành công" };
}

module.exports = {
  login,
  refresh,
  verifyToken,
  logout,
};
