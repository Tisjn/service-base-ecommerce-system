const bcrypt = require("bcryptjs");
const env = require("../config/env");

async function hashPassword(password) {
  return bcrypt.hash(password, env.password.saltRounds);
}

async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

module.exports = {
  hashPassword,
  comparePassword,
};
