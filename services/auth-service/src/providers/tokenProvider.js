class TokenProvider {
  signAccessToken() {
    throw new Error("signAccessToken must be implemented");
  }

  signRefreshToken() {
    throw new Error("signRefreshToken must be implemented");
  }

  verifyAccessToken() {
    throw new Error("verifyAccessToken must be implemented");
  }

  verifyRefreshToken() {
    throw new Error("verifyRefreshToken must be implemented");
  }
}

module.exports = TokenProvider;
