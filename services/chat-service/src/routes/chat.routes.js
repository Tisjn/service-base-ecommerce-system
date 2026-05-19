const express = require("express");
const chatController = require("../controllers/chat.controller");
const auth = require("../middlewares/auth");

const router = express.Router();

router.use(auth);
router.get("/rooms", chatController.listRooms);
router.post("/rooms", chatController.createRoom);
router.get("/rooms/:roomId", chatController.getRoom);
router.put("/rooms/:roomId/join", chatController.joinRoom);
router.put("/rooms/:roomId/close", chatController.closeRoom);
router.put("/rooms/:roomId/reopen", chatController.reopenRoom);
router.get("/rooms/:roomId/messages", chatController.listMessages);

module.exports = router;
