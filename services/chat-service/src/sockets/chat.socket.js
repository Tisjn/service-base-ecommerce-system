const chatService = require("../services/chat.service");
const { isAdmin } = require("../utils/jwt.utils");

function registerChatSocket(io, socket) {
  if (isAdmin(socket.user)) {
    socket.join("admins");
  }

  socket.on("join_room", async ({ roomId } = {}, ack) => {
    try {
      await chatService.requireRoomAccess(roomId, socket.user);
      if (isAdmin(socket.user)) {
        await chatService.joinAsAdmin(roomId, socket.user);
      }
      socket.join(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit("user_joined", {
        roomId,
        userId: socket.user.userId,
        userType: isAdmin(socket.user) ? "admin" : "customer",
      });
      ack?.({ ok: true });
    } catch (error) {
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
      const savedMessage = await chatService.saveMessage({
        roomId: payload.roomId,
        user: socket.user,
        message: payload.message,
        type: payload.type,
        fileUrl: payload.fileUrl,
      });
      io.to(`room:${payload.roomId}`).emit("message", savedMessage);
      if (!isAdmin(socket.user)) {
        io.to("admins").emit("new_message", savedMessage);
      }
      ack?.({ ok: true, message: savedMessage });
    } catch (error) {
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
