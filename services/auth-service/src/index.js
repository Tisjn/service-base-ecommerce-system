const { createApp } = require("./app");
const env = require("./config/env");
const logger = require("./utils/logger");

const app = createApp();

app.listen(env.port, () => {
  logger.info(`auth-service listening on port ${env.port}`);
});
