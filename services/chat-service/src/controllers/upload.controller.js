const fileService = require("../services/file.service");

function uploadFile(req, res) {
  res.status(201).json(fileService.toUploadResponse(req.file));
}

module.exports = { uploadFile };
