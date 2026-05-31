const http = require("http");
const { createApp } = require("./app");
const { createSocketProxy } = require("./proxy/proxyRouter");
const { config } = require("./config/routes.config");
const logger = require("./utils/logger");

const app = createApp();
const server = http.createServer(app);
const socketProxy = createSocketProxy();

server.on("upgrade", (req, socket, head) => {
  const isChatSocket = req.url.startsWith("/socket.io");
  const isOrderSocket = req.url.startsWith("/ws");

  if (!isChatSocket && !isOrderSocket) {
    socket.destroy();
    return;
  }

  socketProxy.upgrade(req, socket, head);
});

const host = process.env.HOST || "0.0.0.0";

server.listen(config.port, host, () => {
  logger.info(`api-gateway listening on ${host}:${config.port}`);
});
