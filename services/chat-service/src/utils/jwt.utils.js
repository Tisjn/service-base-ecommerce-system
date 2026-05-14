const jwt = require("jsonwebtoken");
const env = require("../config/env");
const HttpError = require("./httpError");

function normalizeUser(payload) {
  return {
    userId: Number(payload.sub || payload.userId || payload.id),
    email: payload.email || "",
    role: payload.role || payload.roles?.[0] || "CUSTOMER",
  };
}

function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    if (payload.tokenType && payload.tokenType !== "access") {
      throw new HttpError(401, "Token khong hop le");
    }
    return normalizeUser(payload);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(401, "Token khong hop le hoac da het han");
  }
}

function isAdmin(user) {
  return String(user?.role || "").toUpperCase().includes("ADMIN");
}

module.exports = { verifyAccessToken, isAdmin };
