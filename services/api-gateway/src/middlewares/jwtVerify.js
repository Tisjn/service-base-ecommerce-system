const axios = require("axios");
const { config } = require("../config/routes.config");

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function injectUserHeaders(req, user) {
  req.headers["x-user-id"] = String(user.userId || user.id || "");
  req.headers["x-user-role"] = String(user.role || "");
  req.headers["x-user-email"] = String(user.email || "");
}

async function verifyJWT(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ error: "No token" });
    return;
  }

  try {
    const response = await axios.post(
      `${config.authServiceUrl}/auth/verify`,
      { token },
      { timeout: Number(process.env.AUTH_VERIFY_TIMEOUT_MS || 5000) },
    );

    injectUserHeaders(req, response.data || {});
    next();
  } catch (error) {
    const status = error.response?.status || 401;
    res.status(status).json({
      error: "Invalid token",
      message: error.response?.data?.message || error.message,
    });
  }
}

async function optionalVerifyJWT(req, _res, next) {
  const token = getBearerToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const response = await axios.post(
      `${config.authServiceUrl}/auth/verify`,
      { token },
      { timeout: Number(process.env.AUTH_VERIFY_TIMEOUT_MS || 5000) },
    );

    injectUserHeaders(req, response.data || {});
  } catch (_error) {
    delete req.headers.authorization;
  }

  next();
}

module.exports = {
  verifyJWT,
  optionalVerifyJWT,
  injectUserHeaders,
};
