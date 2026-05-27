const bcrypt = require("bcryptjs");

const env = require("../config/env");

async function hash(password) {
  return bcrypt.hash(password, env.password.saltRounds);
}

async function matches(rawPassword, hashedPassword) {
  return bcrypt.compare(rawPassword, hashedPassword);
}

module.exports = {
  hash,
  matches,
};
