const chatService = require("../services/chat.service");

let socketServer = null;

function setSocketServer(io) {
  socketServer = io;
}

async function createRoom(req, res, next) {
  try {
    const room = await chatService.createRoom(req.user);
    socketServer?.to("admins").emit("new_room", room);
    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
}

async function listRooms(req, res, next) {
  try {
    const rooms = await chatService.listRooms(req.user, req.query.status);
    res.json(rooms);
  } catch (error) {
    next(error);
  }
}

async function getRoom(req, res, next) {
  try {
    res.json(await chatService.getRoom(req.params.roomId, req.user));
  } catch (error) {
    next(error);
  }
}

async function joinRoom(req, res, next) {
  try {
    const room = await chatService.joinAsAdmin(req.params.roomId, req.user);
    socketServer?.to(`room:${room.roomId}`).emit("admin_joined", {
      roomId: room.roomId,
      adminId: room.adminId,
    });
    res.json(room);
  } catch (error) {
    next(error);
  }
}

async function closeRoom(req, res, next) {
  try {
    const room = await chatService.closeRoom(req.params.roomId, req.user);
    socketServer?.to(`room:${room.roomId}`).emit("room_closed", room);
    res.json(room);
  } catch (error) {
    next(error);
  }
}

async function reopenRoom(req, res, next) {
  try {
    const room = await chatService.reopenRoom(req.params.roomId, req.user);
    socketServer?.to(`room:${room.roomId}`).emit("room_reopened", room);
    res.json(room);
  } catch (error) {
    next(error);
  }
}

async function listMessages(req, res, next) {
  try {
    res.json(
      await chatService.listMessages(req.params.roomId, req.user, req.query),
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  closeRoom,
  createRoom,
  getRoom,
  joinRoom,
  listMessages,
  listRooms,
  reopenRoom,
  setSocketServer,
};
