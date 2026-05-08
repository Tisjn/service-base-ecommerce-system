const jwt = require("jsonwebtoken");
const env = require("../config/env");
const AppError = require("./httpError");

function signAccessToken({ userId, email, role }) {
  return jwt.sign(
    {
      tokenType: "access",
      email,
      role,
    },
    env.jwt.secret,
    {
      subject: String(userId),
      expiresIn: env.jwt.accessExpiresIn,
      algorithm: "HS256",
    },
  );
}

function signRefreshToken({ userId, email, role }) {
  return jwt.sign(
    {
      tokenType: "refresh",
      email,
      role,
    },
    env.jwt.secret,
    {
      subject: String(userId),
      expiresIn: env.jwt.refreshExpiresIn,
      algorithm: "HS256",
    },
  );
}

function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.jwt.secret, {
      algorithms: ["HS256"],
    });
    if (payload.tokenType !== "access") {
      throw new AppError(401, "Token không hợp lệ");
    }

    return {
      userId: Number(payload.sub),
      email: payload.email,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, "Token không hợp lệ hoặc đã hết hạn");
  }
}

function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, env.jwt.secret, {
      algorithms: ["HS256"],
    });
    if (payload.tokenType !== "refresh") {
      throw new AppError(401, "Refresh token không hợp lệ");
    }

    return {
      userId: Number(payload.sub),
      email: payload.email,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, "Refresh token không hợp lệ hoặc đã hết hạn");
  }
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
