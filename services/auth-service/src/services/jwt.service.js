const tokenProvider = require("../providers/jwtTokenProvider");

function createAccessToken(payload) {
  return tokenProvider.signAccessToken(payload);
}

function createRefreshToken(payload) {
  return tokenProvider.signRefreshToken(payload);
}

function verifyAccessToken(token) {
  return tokenProvider.verifyAccessToken(token);
}

function verifyRefreshToken(token) {
  return tokenProvider.verifyRefreshToken(token);
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
