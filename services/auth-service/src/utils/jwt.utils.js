const jwtService = require("../services/jwt.service");

module.exports = {
  signAccessToken: jwtService.createAccessToken,
  signRefreshToken: jwtService.createRefreshToken,
  verifyAccessToken: jwtService.verifyAccessToken,
  verifyRefreshToken: jwtService.verifyRefreshToken,
};
