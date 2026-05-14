const http = require("http");
const { createApp } = require("./app");
const env = require("./config/env");
const { createSocketServer } = require("./config/websocket");
const chatController = require("./controllers/chat.controller");
const logger = require("./utils/logger");

const app = createApp();
const server = http.createServer(app);
const io = createSocketServer(server);

chatController.setSocketServer(io);

server.listen(env.port, () => {
  logger.info(`chat-service listening on port ${env.port}`);
});
