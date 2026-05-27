const userRepository = require("../repositories/user.repository");
const passwordEncoder = require("./passwordEncoder.service");
const jwtService = require("./jwt.service");
const refreshTokenService = require("./refreshToken.service");
const AppError = require("../utils/httpError");

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function toTokenPayload(user) {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

function toUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl || null,
  };
}

async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(401, "Email hoac mat khau khong dung");
  }

  if (user.status !== "active") {
    throw new AppError(403, "Tai khoan chua duoc xac minh OTP");
  }

  const validPassword = await passwordEncoder.matches(password, user.password);
  if (!validPassword) {
    throw new AppError(401, "Email hoac mat khau khong dung");
  }

  const payload = toTokenPayload(user);

  return {
    accessToken: jwtService.createAccessToken(payload),
    refreshToken: await refreshTokenService.issue(payload),
    user: toUserResponse(user),
  };
}

async function refresh(refreshToken) {
  const payload = await refreshTokenService.rotate(refreshToken);

  return {
    accessToken: jwtService.createAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    }),
  };
}

async function verifyToken(token) {
  const payload = jwtService.verifyAccessToken(token);

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };
}

async function logout(userId) {
  await refreshTokenService.revokeByUserId(userId);
  return { message: "Dang xuat thanh cong" };
}

module.exports = {
  login,
  refresh,
  verifyToken,
  logout,
};
