const path = require("path");
const { DeleteObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3, hasS3Config } = require("../aws");
const env = require("../config/env");
const AppError = require("../utils/httpError");

async function uploadAvatar(file) {
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

async function deleteAvatar(avatarUrl) {
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

module.exports = {
  uploadAvatar,
  deleteAvatar,
};
