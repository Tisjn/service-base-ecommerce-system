# Auth Service — Project Structure

## Cấu trúc thư mục

```
src/
├── index.js                        # Entry point
├── app.js                          # Express setup, middleware, routes
│
├── config/
│   ├── db.js                       # MySQL connection pool
│   ├── redis.js                    # ioredis client
│   ├── mailer.js                   # Nodemailer transporter (SMTP config)
│   └── env.js                      # Load & validate biến môi trường
│
├── routes/
│   └── auth.routes.js              # Đăng ký tất cả routes
│
├── controllers/
│   └── auth.controller.js          # Nhận request → gọi service → trả response
│
├── services/                       # [Business Layer]
│   ├── auth.service.js             # login(), logout(), refresh(), verifyToken()
│   ├── register.service.js         # sendRegisterOtp(), verifyRegisterOtp()
│   └── password.service.js         # sendResetOtp(), verifyResetOtp()
│
├── repositories/                   # [Persistence Layer]
│   ├── user.repository.js          # MySQL: findByEmail(), createUser(), updatePassword()
│   ├── otp.repository.js           # Redis: set/get/del OTP (register + reset)
│   └── token.repository.js         # Redis: set/get/del refresh token
│
├── middlewares/
│   ├── rateLimiter.js              # express-rate-limit cho /login, /register, /forgot
│   ├── errorHandler.js             # Global error handler
│   └── validateRequest.js          # express-validator middleware
│
└── utils/
    ├── otp.utils.js                # generateOTP() dùng crypto.randomInt
    ├── jwt.utils.js                # signToken(), verifyToken()
    ├── hash.utils.js               # hashPassword(), comparePassword()
    ├── mailer.utils.js             # sendOtpEmail(to, otp, type)
    └── logger.js                   # Winston logger
```

## API Endpoints

| Method | Path                    | Auth     | Mô tả                                |
| ------ | ----------------------- | -------- | ------------------------------------ |
| POST   | `/auth/register`        | Public   | Bước 1: Gửi OTP đăng ký qua email    |
| POST   | `/auth/register/verify` | Public   | Bước 2: Xác minh OTP → tạo tài khoản |
| POST   | `/auth/login`           | Public   | Đăng nhập → nhận JWT                 |
| POST   | `/auth/refresh`         | Public   | Làm mới access token                 |
| POST   | `/auth/logout`          | Bearer   | Đăng xuất                            |
| POST   | `/auth/password/forgot` | Public   | Bước 1: Gửi OTP đổi mật khẩu         |
| POST   | `/auth/password/reset`  | Public   | Bước 2: Xác minh OTP → đổi mật khẩu  |
| POST   | `/auth/verify`          | Internal | API Gateway verify JWT               |

## Luồng dữ liệu — Đăng ký

```
POST /auth/register  { email, password, fullName }
    │
    ▼
rateLimiter (5/phút)
    │
    ▼
validateRequest (email format, password strength)
    │
    ▼
RegisterService.sendRegisterOtp()
    ├── UserRepository.findByEmail()       → MySQL: kiểm tra email chưa tồn tại
    ├── hash.utils.hashPassword()          → bcrypt hash
    ├── otp.utils.generateOTP()            → crypto.randomInt(100000, 999999)
    ├── OtpRepository.setRegisterOtp()     → Redis SETEX 300s
    └── mailer.utils.sendOtpEmail()        → Nodemailer SMTP
    │
    ▼
Response: { message: "OTP đã được gửi đến email của bạn" }


POST /auth/register/verify  { email, otp }
    │
    ▼
RegisterService.verifyRegisterOtp()
    ├── OtpRepository.getRegisterOtp()     → Redis GET
    │   ├── null / hết hạn → 400 "OTP đã hết hạn"
    │   └── sai → tăng attempts, nếu >= 3 → xóa OTP, yêu cầu gửi lại
    ├── OtpRepository.deleteRegisterOtp()  → Redis DEL
    └── UserRepository.createUser()        → MySQL INSERT
    │
    ▼
Response: { message: "Đăng ký thành công" }
```

## Luồng dữ liệu — Đổi mật khẩu

```
POST /auth/password/forgot  { email }
    │
    ▼
PasswordService.sendResetOtp()
    ├── UserRepository.findByEmail()       → MySQL: kiểm tra email tồn tại
    ├── otp.utils.generateOTP()
    ├── OtpRepository.setResetOtp()        → Redis SETEX 300s
    └── mailer.utils.sendOtpEmail(type='reset')  → Nodemailer SMTP
    │
    ▼
Response: { message: "OTP đã được gửi" }


POST /auth/password/reset  { email, otp, newPassword }
    │
    ▼
PasswordService.verifyResetOtp()
    ├── OtpRepository.getResetOtp()        → Redis GET
    ├── So sánh OTP
    ├── hash.utils.hashPassword(newPassword)
    ├── UserRepository.updatePassword()    → MySQL UPDATE
    ├── OtpRepository.deleteResetOtp()     → Redis DEL
    └── TokenRepository.deleteRefreshToken() → Redis DEL (force logout)
    │
    ▼
Response: { message: "Đổi mật khẩu thành công, vui lòng đăng nhập lại" }
```

## Luồng dữ liệu — Đăng nhập

```
POST /auth/login  { email, password }
    │
    ▼
rateLimiter (5/phút)
    │
    ▼
AuthService.login()
    ├── UserRepository.findByEmail()            → MySQL
    ├── Kiểm tra status === 'active'            → nếu chưa verify OTP → 403
    ├── hash.utils.comparePassword()            → bcrypt.compare
    ├── jwt.utils.signToken(payload)            → access token 15 phút
    ├── jwt.utils.signRefreshToken(payload)     → refresh token 7 ngày
    └── TokenRepository.setRefreshToken()       → Redis SETEX 604800s
    │
    ▼
Response: { accessToken, refreshToken }
```

## Database Schema

```sql
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,          -- bcrypt hash
    full_name   VARCHAR(255),
    role        ENUM('customer','admin') DEFAULT 'customer',
    status      ENUM('pending','active') DEFAULT 'pending',
    -- 'pending' = chưa verify OTP, 'active' = đã xác minh
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Redis Key Summary

```
otp:register:{email}   → { otp, hashedPassword, fullName, attempts }  TTL 5 phút
otp:reset:{email}      → { otp, attempts }                            TTL 5 phút
refresh:{userId}       → refresh_token_string                         TTL 7 ngày
```
