const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const now = new Date();
    const folder = file.mimetype.startsWith("image/") ? "images" : "files";
    const destination = path.join(
      env.upload.path,
      "chat",
      folder,
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0"),
    );
    fs.mkdirSync(destination, { recursive: true });
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${req.user.userId}_${Date.now()}_${uuidv4()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = [...env.upload.allowedImageTypes, ...env.upload.allowedFileTypes];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error("File type not allowed"));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.upload.maxFileSize },
});

module.exports = { upload };
