const http = require("http");
const { createApp } = require("./app");
const env = require("./config/env");
const { createSocketServer } = require("./config/websocket");
const realtimeService = require("./services/realtime.service");
const logger = require("./utils/logger");

const app = createApp();
const server = http.createServer(app);
const io = createSocketServer(server);

realtimeService.setSocketServer(io);

server.listen(env.port, () => {
  logger.info(`chat-service listening on port ${env.port}`);
});
