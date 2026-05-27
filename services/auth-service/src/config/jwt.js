const env = require("./env");

module.exports = {
  secret: env.jwt.secret,
  accessExpiresIn: env.jwt.accessExpiresIn,
  refreshExpiresIn: env.jwt.refreshExpiresIn,
  algorithm: "HS256",
};
