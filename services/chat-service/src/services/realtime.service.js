let socketServer = null;

function setSocketServer(io) {
  socketServer = io;
}

function notifyNewRoom(room) {
  socketServer?.to("admins").emit("new_room", room);
}

function notifyAdminJoined(room) {
  socketServer?.to(`room:${room.roomId}`).emit("admin_joined", {
    roomId: room.roomId,
    adminId: room.adminId,
  });
}

function notifyRoomClosed(room) {
  socketServer?.to(`room:${room.roomId}`).emit("room_closed", room);
}

function notifyRoomReopened(room) {
  socketServer?.to(`room:${room.roomId}`).emit("room_reopened", room);
}

function notifyMessage(roomId, message) {
  socketServer?.to(`room:${roomId}`).emit("message", message);
  socketServer?.to("admins").emit("new_message", message);
}

module.exports = {
  notifyAdminJoined,
  notifyMessage,
  notifyNewRoom,
  notifyRoomClosed,
  notifyRoomReopened,
  setSocketServer,
};
