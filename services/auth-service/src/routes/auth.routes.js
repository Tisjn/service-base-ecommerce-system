const express = require("express");
const { body } = require("express-validator");
const multer = require("multer");

const authController = require("../controllers/auth.controller");
const authenticate = require("../middlewares/authenticate");
const validateRequest = require("../middlewares/validateRequest");
const {
  registerLimiter,
  loginLimiter,
  passwordLimiter,
} = require("../middlewares/rateLimiter");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Chỉ chấp nhận tệp ảnh."));
    }
    cb(null, true);
  },
});

const router = express.Router();

const emailRule = body("email")
  .isEmail()
  .withMessage("Email không hợp lệ")
  .normalizeEmail();

router.post(
  "/upload-avatar",
  upload.single("avatar"),
  authController.uploadAvatar,
);

router.post(
  "/register",
  registerLimiter,
  [
    emailRule,
    body("password")
      .isLength({ min: 8 })
      .withMessage("Mật khẩu phải có ít nhất 8 ký tự"),
    body("fullName")
      .trim()
      .notEmpty()
      .withMessage("Họ tên không được để trống"),
  ],
  validateRequest,
  authController.register,
);

router.post(
  "/register/verify",
  [
    emailRule,
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP phải gồm 6 chữ số"),
  ],
  validateRequest,
  authController.verifyRegister,
);

router.post(
  "/login",
  loginLimiter,
  [
    emailRule,
    body("password").notEmpty().withMessage("Mật khẩu không được để trống"),
  ],
  validateRequest,
  authController.login,
);

router.post(
  "/password/forgot",
  passwordLimiter,
  [emailRule],
  validateRequest,
  authController.forgotPassword,
);

router.post(
  "/password/reset",
  passwordLimiter,
  [
    emailRule,
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP phải gồm 6 chữ số"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Mật khẩu mới phải có ít nhất 8 ký tự"),
  ],
  validateRequest,
  authController.resetPassword,
);

router.put(
  "/profile/password",
  authenticate,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Mat khau hien tai khong duoc de trong"),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP phải gồm 6 chữ số"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Mat khau moi phai co it nhat 8 ky tu"),
  ],
  validateRequest,
  authController.changePassword,
);

router.post(
  "/refresh",
  [
    body("refreshToken")
      .notEmpty()
      .withMessage("Refresh token không được để trống"),
  ],
  validateRequest,
  authController.refresh,
);

router.post("/logout", authenticate, authController.logout);

router.get("/profile", authenticate, authController.getProfile);

router.put(
  "/profile",
  authenticate,
  [
    body("fullName")
      .trim()
      .notEmpty()
      .withMessage("Ho ten khong duoc de trong"),
  ],
  validateRequest,
  authController.updateProfile,
);

router.put(
  "/profile/avatar",
  authenticate,
  upload.single("avatar"),
  authController.updateProfileAvatar,
);

router.post(
  "/profile/avatar",
  authenticate,
  upload.single("avatar"),
  authController.updateProfileAvatar,
);

router.delete("/profile/avatar", authenticate, authController.deleteProfileAvatar);

router.post("/verify", authController.verify);

module.exports = router;
