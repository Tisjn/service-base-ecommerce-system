# Auth Service — Product Description

## Tổng quan

**auth-service** là dịch vụ xác thực và phân quyền trung tâm của hệ thống. Mọi request cần xác thực danh tính đều đi qua đây. Service này chịu trách nhiệm: đăng ký có xác minh OTP qua email SMTP, đăng nhập cấp JWT, đổi mật khẩu có xác minh OTP, và verify token cho API Gateway.

## Actors & Use Cases

| Actor       | Hành động                                                               |
| ----------- | ----------------------------------------------------------------------- |
| Guest       | Đăng ký tài khoản → nhận OTP qua email → xác minh OTP → tạo tài khoản   |
| Guest       | Đăng nhập → nhận JWT access token + refresh token                       |
| Customer    | Yêu cầu đổi mật khẩu → nhận OTP qua email → xác minh → đặt mật khẩu mới |
| Customer    | Làm mới access token bằng refresh token                                 |
| Customer    | Đăng xuất                                                               |
| API Gateway | Xác minh JWT trước khi forward request đến service khác                 |

## Chức năng chính

### 1. Đăng ký (Register) — 2 bước có OTP

**Bước 1 — Gửi OTP đăng ký (`POST /auth/register`):**

- Nhận `email`, `password`, `fullName`
- Validate đầu vào (email hợp lệ, password đủ mạnh ≥ 8 ký tự)
- Kiểm tra email chưa tồn tại trong MySQL
- Hash password bằng **bcrypt** (salt rounds = 12)
- Tạo OTP 6 số ngẫu nhiên
- Lưu vào Redis: key `otp:register:{email}`, value `{ otp, hashedPassword, fullName }`, TTL **5 phút**
- Gửi email OTP qua **SMTP (Nodemailer)**
- Trả về `{ message: "OTP đã được gửi đến email của bạn" }`

**Bước 2 — Xác minh OTP (`POST /auth/register/verify`):**

- Nhận `email` + `otp`
- Lấy data từ Redis key `otp:register:{email}`
- So sánh OTP, kiểm tra còn hạn
- Nếu đúng → INSERT user vào MySQL với status `active`, xóa key Redis
- Nếu sai → trả lỗi (cho phép thử lại tối đa 3 lần, lưu số lần thử vào Redis)
- Nếu hết hạn → yêu cầu gửi lại OTP
- Trả về `{ message: "Đăng ký thành công" }`

### 2. Đăng nhập (Login — `POST /auth/login`)

- Nhận `email` + `password`
- Kiểm tra user tồn tại và có status `active` (đã verify OTP)
- So sánh password với bcrypt hash trong DB
- Tạo **JWT access token** (TTL: 15 phút) + **refresh token** (TTL: 7 ngày)
- Lưu refresh token vào Redis: key `refresh:{userId}`, TTL 7 ngày
- Trả về `{ accessToken, refreshToken, user: { id, email, role } }`

### 3. Đổi mật khẩu — 2 bước có OTP

**Bước 1 — Yêu cầu OTP đổi mật khẩu (`POST /auth/password/forgot`):**

- Nhận `email`
- Kiểm tra email tồn tại trong DB
- Tạo OTP 6 số, lưu Redis: key `otp:reset:{email}`, TTL **5 phút**
- Gửi email OTP qua SMTP
- Trả về `{ message: "OTP đã được gửi" }`

**Bước 2 — Xác minh OTP + đặt mật khẩu mới (`POST /auth/password/reset`):**

- Nhận `email`, `otp`, `newPassword`
- Verify OTP từ Redis key `otp:reset:{email}`
- Hash `newPassword` bằng bcrypt
- UPDATE password trong MySQL
- Xóa OTP khỏi Redis
- Thu hồi tất cả refresh token của user: `DEL refresh:{userId}` (force logout mọi thiết bị)
- Trả về `{ message: "Đổi mật khẩu thành công, vui lòng đăng nhập lại" }`

### 4. Xác minh token (Internal — `POST /auth/verify`)

- Endpoint nội bộ dành riêng cho API Gateway
- Nhận JWT, giải mã và kiểm tra chữ ký + hạn sử dụng
- Trả về `{ userId, email, role }` nếu hợp lệ, hoặc 401 nếu không

### 5. Làm mới token (`POST /auth/refresh`)

- Nhận `refreshToken`
- Kiểm tra token còn tồn tại trong Redis
- Cấp access token mới (15 phút)
- Trả về `{ accessToken }`

### 6. Đăng xuất (`POST /auth/logout`)

- Xóa refresh token khỏi Redis: `DEL refresh:{userId}`
- Access token cũ tự hết hạn sau tối đa 15 phút

## Email Template

**OTP Đăng ký:**

```
Subject: [ShopNova] Xác minh tài khoản của bạn

Xin chào {fullName},
Mã OTP xác minh tài khoản của bạn là: 123456
Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.
```

**OTP Đổi mật khẩu:**

```
Subject: [ShopNova] Yêu cầu đặt lại mật khẩu

Xin chào,
Mã OTP để đặt lại mật khẩu của bạn là: 654321
Mã có hiệu lực trong 5 phút.
Nếu bạn không yêu cầu, hãy bỏ qua email này.
```

## Tiêu chí chấm điểm đáp ứng

| Tiêu chí                     | Mô tả                                                                                   | Điểm |
| ---------------------------- | --------------------------------------------------------------------------------------- | ---- |
| JWT – Return Token khi Login | Trả access + refresh token sau login thành công                                         | 0.25 |
| JWT – Applied to problem     | JWT bảo vệ tất cả route qua API Gateway                                                 | 0.25 |
| Redis CRUD                   | OTP: SET (create) → GET (read) → DEL (delete). Refresh token: SET → GET → SET lại → DEL | 0.5  |
| Project Description          | API Gateway + Redis + JWT có mặt trong system diagram                                   | 0.75 |

## Biến môi trường (auth-service)

Ví dụ các biến `auth-service` dùng (được load từ `src/config/env.js`):

```env
# Server
PORT=3001

# JWT
JWT_SECRET=your_super_secret_key_at_least_32_chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis
REDIS_HOST=redis-cache
REDIS_PORT=6379

# Shared AWS RDS variables (project-level)
RDS_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=true

# Database mapping for auth-service
DB_HOST=${RDS_HOST}
DB_PORT=${RDS_PORT}
DB_NAME=authdb
DB_USER=${RDS_USER}
DB_PASSWORD=${RDS_PASSWORD}

# SMTP (Gmail App Password recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourapp@gmail.com
SMTP_PASS=your_gmail_app_password

# OTP
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3
```
