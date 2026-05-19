const { v4: uuidv4 } = require("uuid");
const roomRepository = require("../repositories/room.repository");
const messageRepository = require("../repositories/message.repository");
const HttpError = require("../utils/httpError");
const { isAdmin } = require("../utils/jwt.utils");
const { sanitizeText } = require("../utils/sanitizer");

function normalizeRoom(room) {
  return {
    roomId: room.roomId,
    customerId: room.customerId,
    customerEmail: room.customerEmail || "",
    customerName: room.customerName || room.customerFullName || "",
    adminId: room.adminId || null,
    status: room.status,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    closedAt: room.closedAt || null,
    lastMessage: room.lastMessage || "",
    lastMessageAt: room.lastMessageAt || null,
  };
}

async function requireRoomAccess(roomId, user) {
  const room = await roomRepository.findById(roomId);
  if (!room) {
    throw new HttpError(404, "Khong tim thay phong chat");
  }
  if (!isAdmin(user) && String(room.customerId) !== String(user.userId)) {
    throw new HttpError(403, "Ban khong co quyen truy cap phong chat nay");
  }
  return room;
}

async function createRoom(user) {
  if (isAdmin(user)) {
    throw new HttpError(400, "Admin khong can tao phong chat customer");
  }

  const latestRoom = await roomRepository.findLatestByCustomer(user.userId);
  if (latestRoom) {
    return normalizeRoom(latestRoom);
  }

  const now = new Date().toISOString();
  const room = {
    roomId: `room_${uuidv4()}`,
    customerId: String(user.userId),
    customerEmail: user.email || "",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  return normalizeRoom(await roomRepository.create(room));
}

async function listRooms(user, status) {
  const rooms = isAdmin(user)
    ? await roomRepository.listForAdmin(status)
    : await roomRepository.listForCustomer(user.userId);
  return rooms.map(normalizeRoom);
}

async function getRoom(roomId, user) {
  return normalizeRoom(await requireRoomAccess(roomId, user));
}

async function joinAsAdmin(roomId, user) {
  if (!isAdmin(user)) {
    throw new HttpError(403, "Chi admin moi co the nhan phong chat");
  }
  await requireRoomAccess(roomId, user);
  return normalizeRoom(await roomRepository.assignAdmin(roomId, user.userId));
}

async function closeRoom(roomId, user) {
  await requireRoomAccess(roomId, user);
  return normalizeRoom(await roomRepository.markClosed(roomId));
}

async function reopenRoom(roomId, user) {
  if (!isAdmin(user)) {
    throw new HttpError(403, "Chi admin moi co the mo lai phong chat");
  }
  await requireRoomAccess(roomId, user);
  return normalizeRoom(await roomRepository.reopenRoom(roomId));
}

async function saveMessage({
  roomId,
  user,
  message,
  type = "text",
  fileUrl,
  mimeType,
}) {
  const room = await requireRoomAccess(roomId, user);
  if (room.status === "closed") {
    throw new HttpError(400, "Phong chat da dong");
  }

  if (isAdmin(user) && !room.adminId) {
    await roomRepository.assignAdmin(roomId, user.userId);
  }

  const cleanMessage = sanitizeText(message);
  if (!cleanMessage && !fileUrl) {
    throw new HttpError(400, "Noi dung tin nhan khong hop le");
  }

  const timestamp = new Date().toISOString();
  const messageId = `msg_${uuidv4()}`;
  const item = {
    roomId,
    sentAt: `${timestamp}#${messageId}`,
    messageId,
    senderId: String(user.userId),
    senderType: isAdmin(user) ? "admin" : "customer",
    senderEmail: user.email || "",
    message: cleanMessage,
    messageType: type || "text",
    fileUrl: fileUrl || null,
    mimeType: mimeType || (type === "image" ? "image/*" : null),
    timestamp,
  };

  await messageRepository.save(item);
  await roomRepository.updateLastMessage(roomId, item);
  return {
    id: item.messageId,
    roomId: item.roomId,
    senderId: item.senderId,
    senderType: item.senderType,
    senderEmail: item.senderEmail,
    message: item.message,
    type: item.messageType,
    fileUrl: item.fileUrl,
    mimeType: item.mimeType,
    timestamp: item.timestamp,
  };
}

async function listMessages(roomId, user, query) {
  await requireRoomAccess(roomId, user);
  const limit = Math.min(Number(query.limit) || 50, 100);
  const result = await messageRepository.listByRoom(roomId, {
    limit,
    cursor: query.cursor,
  });
  return {
    messages: result.items.map((item) => ({
      id: item.messageId,
      roomId: item.roomId,
      senderId: item.senderId,
      senderType: item.senderType,
      senderEmail: item.senderEmail,
      message: item.message,
      type: item.messageType,
      fileUrl: item.fileUrl,
      mimeType: item.mimeType || null,
      timestamp: item.timestamp,
    })),
    nextCursor: result.nextCursor,
  };
}

module.exports = {
  closeRoom,
  createRoom,
  getRoom,
  joinAsAdmin,
  listMessages,
  listRooms,
  requireRoomAccess,
  reopenRoom,
  saveMessage,
};
