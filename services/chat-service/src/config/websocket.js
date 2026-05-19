const { Server } = require("socket.io");
const env = require("./env");
const { verifyAccessToken } = require("../utils/jwt.utils");
const { registerChatSocket } = require("../sockets/chat.socket");
const logger = require("../utils/logger");

function createSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: env.frontendUrl,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      String(socket.handshake.headers.authorization || "").replace(
        "Bearer ",
        "",
      );
    try {
      socket.user = verifyAccessToken(token);
      next();
    } catch (error) {
      logger.warn("socket auth failed", {
        id: socket.id,
        authTokenPresent: Boolean(socket.handshake?.auth?.token),
        authHeaderPresent: Boolean(socket.handshake?.headers?.authorization),
        error: error.message,
      });
      next(error);
    }
  });

  io.on("connection", (socket) => {
    registerChatSocket(io, socket);
  });

  return io;
}

module.exports = { createSocketServer };
