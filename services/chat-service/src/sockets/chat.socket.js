const chatService = require("../services/chat.service");
const realtimeService = require("../services/realtime.service");
const { isAdmin } = require("../utils/jwt.utils");
const logger = require("../utils/logger");

function registerChatSocket(socket) {
  if (isAdmin(socket.user)) {
    socket.join("admins");
  }

  logger.info("socket connected", {
    user: socket.user?.userId || socket.user?.id,
    id: socket.id,
  });

  socket.on("join_room", async ({ roomId } = {}, ack) => {
    try {
      await chatService.requireRoomAccess(roomId, socket.user);
      if (isAdmin(socket.user)) {
        await chatService.joinAsAdmin(roomId, socket.user);
      }
      socket.join(`room:${roomId}`);
      logger.info("socket joined room", {
        socketId: socket.id,
        roomId,
        user: socket.user?.userId,
      });
      socket.to(`room:${roomId}`).emit("user_joined", {
        roomId,
        userId: socket.user.userId,
        userType: isAdmin(socket.user) ? "admin" : "customer",
      });
      ack?.({ ok: true });
    } catch (error) {
      logger.error("join_room error", {
        error: error.message,
        socketId: socket.id,
        roomId,
      });
      ack?.({ ok: false, message: error.message });
      socket.emit("chat_error", { message: error.message });
    }
  });

  socket.on("leave_room", ({ roomId } = {}) => {
    socket.leave(`room:${roomId}`);
    socket.to(`room:${roomId}`).emit("user_left", {
      roomId,
      userId: socket.user.userId,
      userType: isAdmin(socket.user) ? "admin" : "customer",
    });
  });

  socket.on("message", async (payload = {}, ack) => {
    try {
      logger.info("socket received message", { socketId: socket.id, payload });
      const savedMessage = await chatService.saveMessage({
        roomId: payload.roomId,
        user: socket.user,
        message: payload.message,
        type: payload.type,
        fileUrl: payload.fileUrl,
        mimeType: payload.mimeType,
      });
      logger.info("emitting saved message", {
        roomId: payload.roomId,
        messageId: savedMessage.id,
      });
      realtimeService.notifyMessage(payload.roomId, savedMessage);

      ack?.({ ok: true, message: savedMessage });
    } catch (error) {
      logger.error("message handling error", {
        error: error.message,
        socketId: socket.id,
        payload,
      });
      ack?.({ ok: false, message: error.message });
      socket.emit("chat_error", { message: error.message });
    }
  });

  socket.on("typing", ({ roomId, isTyping: typing } = {}) => {
    socket.to(`room:${roomId}`).emit("typing", {
      roomId,
      userId: socket.user.userId,
      userType: isAdmin(socket.user) ? "admin" : "customer",
      isTyping: Boolean(typing),
    });
  });
}

module.exports = { registerChatSocket };
