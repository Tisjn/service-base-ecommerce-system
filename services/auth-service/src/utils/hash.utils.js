const passwordEncoder = require("../services/passwordEncoder.service");

module.exports = {
  hashPassword: passwordEncoder.hash,
  comparePassword: passwordEncoder.matches,
};
