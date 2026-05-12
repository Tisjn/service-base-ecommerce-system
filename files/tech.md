# Auth Service — Tech Stack

## Ngôn ngữ & Runtime

**Node.js (v20 LTS)** — Lý do chọn:

- Nodemailer (SMTP) là thư viện trưởng thành nhất trên Node ecosystem
- JWT + bcrypt native bindings hoạt động tốt
- I/O-bound workload (DB + Redis + SMTP) → Node async model phù hợp
- Docker image nhỏ (~150MB vs ~400MB Spring Boot)

## Framework & Thư viện

| Thư viện               | Mục đích                               |
| ---------------------- | -------------------------------------- |
| **Express.js**         | HTTP server, routing                   |
| **jsonwebtoken**       | Ký và xác minh JWT (HS256)             |
| **bcryptjs**           | Hash & compare password                |
| **nodemailer**         | Gửi email OTP qua SMTP                 |
| **ioredis**            | Redis client — lưu OTP + refresh token |
| **mysql2**             | MySQL client (Promise-based)           |
| **express-rate-limit** | Rate Limiter (chống spam OTP)          |
| **express-validator**  | Validate request body                  |
| **crypto** (built-in)  | Tạo OTP ngẫu nhiên 6 số                |
| **dotenv**             | Quản lý biến môi trường                |
| **winston**            | Logging                                |

## Cấu hình SMTP (Nodemailer)

```js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // smtp.gmail.com
  port: process.env.SMTP_PORT, // 587
  secure: false, // true nếu dùng port 465
  auth: {
    user: process.env.SMTP_USER, // yourapp@gmail.com
    pass: process.env.SMTP_PASS, // Gmail App Password (không dùng pass thật)
  },
});

// Gửi OTP
async function sendOtpEmail(to, otp, type = "register") {
  const subject =
    type === "register"
      ? "[ShopNova] Xác minh tài khoản của bạn"
      : "[ShopNova] Yêu cầu đặt lại mật khẩu";

  await transporter.sendMail({
    from: `"ShopNova" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: `<p>Mã OTP của bạn là: <strong>${otp}</strong></p>
           <p>Mã có hiệu lực trong <strong>5 phút</strong>.</p>`,
  });
}
```

> 💡 **Gợi ý SMTP provider**: Dùng **Gmail** với App Password (bật 2FA → tạo App Password). Hoặc dùng **Mailtrap** (free, sandbox) cho môi trường dev để không gửi email thật khi test.

## Tạo OTP ngẫu nhiên

```js
import crypto from "crypto";

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString(); // 6 chữ số
}
```

## Redis — Key Patterns & TTL

| Key                    | Value                                         | TTL    | Mục đích         |
| ---------------------- | --------------------------------------------- | ------ | ---------------- |
| `otp:register:{email}` | `{ otp, hashedPassword, fullName, attempts }` | 5 phút | OTP đăng ký      |
| `otp:reset:{email}`    | `{ otp, attempts }`                           | 5 phút | OTP đổi mật khẩu |
| `refresh:{userId}`     | refresh token string                          | 7 ngày | Refresh token    |

**CRUD Redis đầy đủ (tiêu chí #5):**

```js
// CREATE — lưu OTP khi gửi email
await redis.setex(
  `otp:register:${email}`,
  300,
  JSON.stringify({ otp, hashedPassword, fullName, attempts: 0 }),
);

// READ — lấy OTP để verify
const data = JSON.parse(await redis.get(`otp:register:${email}`));

// UPDATE — tăng số lần thử sai
data.attempts += 1;
await redis.setex(`otp:register:${email}`, 300, JSON.stringify(data));

// DELETE — xóa sau khi verify thành công
await redis.del(`otp:register:${email}`);
```

## JWT Config

```
Access Token  : HS256, TTL 15 phút, payload: { sub, email, role, iat, exp }
Refresh Token : HS256, TTL 7 ngày, lưu Redis
Secret        : JWT_SECRET từ biến môi trường (≥ 32 ký tự)
```

## Rate Limiter — Chống spam OTP (Tiêu chí #7)

```js
// Giới hạn gọi /register và /password/forgot: 5 lần/phút/IP
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút." },
});
app.use("/auth/register", otpLimiter);
app.use("/auth/password/forgot", otpLimiter);

// Giới hạn login: 5 lần/phút/IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau." },
});
app.use("/auth/login", loginLimiter);
```

## Biến môi trường

```env
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
DB_USER=${RDS_USER}
DB_PASSWORD=${RDS_PASSWORD}
DB_NAME=authdb

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourapp@gmail.com
SMTP_PASS=your_gmail_app_password

# OTP
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3
```

## Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "src/index.js"]
```
