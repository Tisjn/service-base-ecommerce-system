const express = require("express");
const auth = require("../middlewares/auth");
const { upload } = require("../services/file.service");
const uploadController = require("../controllers/upload.controller");

const router = express.Router();

router.post("/upload", auth, upload.single("file"), uploadController.uploadFile);

module.exports = router;
