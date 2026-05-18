const path = require("path");
const { DeleteObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3, hasS3Config } = require("../aws");
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

function getBearerPayload(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    throw new AppError(401, "Thieu access token");
  }

  return verifyAccessToken(token);
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl || null,
  };
}

async function uploadAvatarToS3(file) {
  if (!hasS3Config || !s3) {
    throw new AppError(503, "Dich vu upload avatar chua duoc cau hinh AWS S3");
  }

  if (!file || !file.buffer) {
    throw new AppError(400, "Khong co tep anh hoac dinh dang khong hop le.");
  }

  const bucket = env.aws.bucket;
  const region = env.aws.region || "us-east-1";
  const extension = path.extname(file.originalname) || "";
  const key = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  const avatarUrl =
    region === "us-east-1"
      ? `https://${bucket}.s3.amazonaws.com/${key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return { avatarUrl, key };
}

function extractS3KeyFromUrl(avatarUrl) {
  if (!avatarUrl || !env.aws.bucket) {
    return null;
  }

  try {
    const parsed = new URL(avatarUrl);
    const key = parsed.pathname.replace(/^\/+/, "");
    if (parsed.hostname.startsWith(`${env.aws.bucket}.s3`) && key) {
      return decodeURIComponent(key);
    }
  } catch (_error) {
    return null;
  }

  return null;
}

async function deleteAvatarFromS3(avatarUrl) {
  if (!hasS3Config || !s3) {
    return;
  }

  const key = extractS3KeyFromUrl(avatarUrl);
  if (!key) {
    return;
  }

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.aws.bucket,
        Key: key,
      }),
    );
  } catch (_error) {
    // RDS avatar_url is authoritative for the app; S3 cleanup is best effort.
  }
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
  const { avatarUrl } = await uploadAvatarToS3(req.file);
  res.status(200).json({ avatarUrl });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
});

const getProfile = asyncHandler(async (req, res) => {
  const payload = getBearerPayload(req);
  const user = await userRepository.findById(payload.userId);

  if (!user) {
    throw new AppError(404, "Nguoi dung khong ton tai");
  }

  res.status(200).json(toPublicUser(user));
});

const updateProfile = asyncHandler(async (req, res) => {
  const payload = getBearerPayload(req);
  const fullName = String(req.body.fullName || "").trim();

  if (!fullName) {
    throw new AppError(400, "Ho ten khong duoc de trong");
  }

  const user = await userRepository.updateProfile(payload.userId, { fullName });
  if (!user) {
    throw new AppError(404, "Nguoi dung khong ton tai");
  }

  res.status(200).json(toPublicUser(user));
});

const updateProfileAvatar = asyncHandler(async (req, res) => {
  const payload = getBearerPayload(req);
  const existingUser = await userRepository.findById(payload.userId);
  if (!existingUser) {
    throw new AppError(404, "Nguoi dung khong ton tai");
  }

  const { avatarUrl } = await uploadAvatarToS3(req.file);
  const user = await userRepository.updateAvatarUrl(payload.userId, avatarUrl);
  await deleteAvatarFromS3(existingUser.avatarUrl);

  res.status(200).json(toPublicUser(user));
});

const deleteProfileAvatar = asyncHandler(async (req, res) => {
  const payload = getBearerPayload(req);
  const existingUser = await userRepository.findById(payload.userId);
  if (!existingUser) {
    throw new AppError(404, "Nguoi dung khong ton tai");
  }

  const user = await userRepository.updateAvatarUrl(payload.userId, null);
  await deleteAvatarFromS3(existingUser.avatarUrl);

  res.status(200).json(toPublicUser(user));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await passwordService.sendResetOtp(req.body.email);
  res.status(200).json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await passwordService.verifyResetOtp(req.body);
  res.status(200).json(result);
});

const changePassword = asyncHandler(async (req, res) => {
  const payload = getBearerPayload(req);
  const result = await passwordService.changePassword({
    userId: payload.userId,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });
  res.status(200).json(result);
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  res.status(200).json(result);
});

const logout = asyncHandler(async (req, res) => {
  const payload = getBearerPayload(req);
  const result = await authService.logout(payload.userId);
  res.status(200).json(result);
});

const verify = asyncHandler(async (req, res) => {
  const token =
    req.body.token ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new AppError(401, "Thieu token");
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
  updateProfile,
  updateProfileAvatar,
  deleteProfileAvatar,
  forgotPassword,
  resetPassword,
  changePassword,
  refresh,
  logout,
  verify,
};
