const HttpError = require("../utils/httpError");
const { verifyAccessToken } = require("../utils/jwt.utils");

function authMiddleware(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return next(new HttpError(401, "Can dang nhap de su dung chat"));
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authMiddleware;
