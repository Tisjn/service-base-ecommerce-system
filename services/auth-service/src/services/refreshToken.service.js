const tokenRepository = require("../repositories/token.repository");
const jwtService = require("./jwt.service");
const AppError = require("../utils/httpError");

const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

async function issue(payload) {
  const refreshToken = jwtService.createRefreshToken(payload);
  await tokenRepository.setRefreshToken(
    payload.userId,
    refreshToken,
    REFRESH_TOKEN_TTL_SECONDS,
  );

  return refreshToken;
}

async function rotate(refreshToken) {
  const payload = jwtService.verifyRefreshToken(refreshToken);
  const storedRefreshToken = await tokenRepository.getRefreshToken(
    payload.userId,
  );

  if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
    throw new AppError(401, "Refresh token khong hop le");
  }

  await tokenRepository.setRefreshToken(
    payload.userId,
    refreshToken,
    REFRESH_TOKEN_TTL_SECONDS,
  );

  return payload;
}

async function revokeByUserId(userId) {
  await tokenRepository.deleteRefreshToken(userId);
}

module.exports = {
  issue,
  rotate,
  revokeByUserId,
  REFRESH_TOKEN_TTL_SECONDS,
};
