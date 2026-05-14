const path = require("path");
const env = require("../config/env");

function uploadFile(req, res) {
  const file = req.file;
  const isImage = file.mimetype.startsWith("image/");
  const relativePath = path.relative(env.upload.path, file.path).replace(/\\/g, "/");

  res.status(201).json({
    fileName: file.filename,
    fileUrl: `/uploads/${relativePath}`,
    type: isImage ? "image" : "file",
    mimeType: file.mimetype,
    size: file.size,
  });
}

module.exports = { uploadFile };
