const jwtService = require("../services/jwt.service");
const AppError = require("../utils/httpError");

function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      throw new AppError(401, "Thieu access token");
    }

    req.user = jwtService.verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
