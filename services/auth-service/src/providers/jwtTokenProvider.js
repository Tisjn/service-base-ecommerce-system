const jwt = require("jsonwebtoken");

const jwtConfig = require("../config/jwt");
const TokenProvider = require("./tokenProvider");
const AppError = require("../utils/httpError");

class JwtTokenProvider extends TokenProvider {
  signAccessToken({ userId, email, role }) {
    return jwt.sign(
      {
        tokenType: "access",
        email,
        role,
      },
      jwtConfig.secret,
      {
        subject: String(userId),
        expiresIn: jwtConfig.accessExpiresIn,
        algorithm: jwtConfig.algorithm,
      },
    );
  }

  signRefreshToken({ userId, email, role }) {
    return jwt.sign(
      {
        tokenType: "refresh",
        email,
        role,
      },
      jwtConfig.secret,
      {
        subject: String(userId),
        expiresIn: jwtConfig.refreshExpiresIn,
        algorithm: jwtConfig.algorithm,
      },
    );
  }

  verifyAccessToken(token) {
    return this.verifyToken(token, "access", "Token khong hop le");
  }

  verifyRefreshToken(token) {
    return this.verifyToken(token, "refresh", "Refresh token khong hop le");
  }

  verifyToken(token, expectedType, invalidMessage) {
    try {
      const payload = jwt.verify(token, jwtConfig.secret, {
        algorithms: [jwtConfig.algorithm],
      });

      if (payload.tokenType !== expectedType) {
        throw new AppError(401, invalidMessage);
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

      throw new AppError(401, `${invalidMessage} hoac da het han`);
    }
  }
}

module.exports = new JwtTokenProvider();
