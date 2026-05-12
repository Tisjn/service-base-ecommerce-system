const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3 } = require("../aws");
const env = require("../config/env");
const authService = require("../services/auth.service");
const registerService = require("../services/register.service");
const passwordService = require("../services/password.service");
const userRepository = require("../repositories/user.repository");
const { verifyAccessToken } = require("../utils/jwt.utils");
const AppError = require("../utils/httpError");

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const register = asyncHandler(async (req, res) => {
  const result = await registerService.sendRegisterOtp(req.body);
  res.status(200).json(result);
});

const verifyRegister = asyncHandler(async (req, res) => {
  const result = await registerService.verifyRegisterOtp(req.body);
  res.status(201).json(result);
});

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw new AppError(400, "Không có tệp ảnh hoặc định dạng không hợp lệ.");
  }

  const bucket = env.aws.bucket;
  const region = env.aws.region || "us-east-1";
  const extension = path.extname(req.file.originalname) || "";
  const key = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read",
    }),
  );

  const endpoint =
    region === "us-east-1"
      ? `https://${bucket}.s3.amazonaws.com/${key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  res.status(200).json({ avatarUrl: endpoint });
});
const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
});

const getProfile = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    throw new AppError(401, "Thiếu access token");
  }

  const payload = verifyAccessToken(token);
  const user = await userRepository.findById(payload.userId);

  if (!user) {
    throw new AppError(404, "Người dùng không tồn tại");
  }

  res.status(200).json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl || null,
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await passwordService.sendResetOtp(req.body.email);
  res.status(200).json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await passwordService.verifyResetOtp(req.body);
  res.status(200).json(result);
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  res.status(200).json(result);
});

const logout = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    throw new AppError(401, "Thiếu access token");
  }

  const payload = verifyAccessToken(token);
  const result = await authService.logout(payload.userId);
  res.status(200).json(result);
});

const verify = asyncHandler(async (req, res) => {
  const token =
    req.body.token ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new AppError(401, "Thiếu token");
  }

  const result = await authService.verifyToken(token);
  res.status(200).json(result);
});

module.exports = {
  register,
  verifyRegister,
  uploadAvatar,
  login,
  getProfile,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  verify,
};
