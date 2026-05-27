const chatService = require("../services/chat.service");
const realtimeService = require("../services/realtime.service");

async function createRoom(req, res, next) {
  try {
    const room = await chatService.createRoom(req.user);
    realtimeService.notifyNewRoom(room);
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
    realtimeService.notifyAdminJoined(room);
    res.json(room);
  } catch (error) {
    next(error);
  }
}

async function closeRoom(req, res, next) {
  try {
    const room = await chatService.closeRoom(req.params.roomId, req.user);
    realtimeService.notifyRoomClosed(room);
    res.json(room);
  } catch (error) {
    next(error);
  }
}

async function reopenRoom(req, res, next) {
  try {
    const room = await chatService.reopenRoom(req.params.roomId, req.user);
    realtimeService.notifyRoomReopened(room);
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
};
