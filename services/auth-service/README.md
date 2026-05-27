# Auth Service (Node.js)

Lightweight authentication microservice for ShopNova - OTP via SMTP, JWT access + refresh, Redis for OTP and refresh tokens, MySQL (RDS) for users.

AWS S3 is only required for `POST /auth/upload-avatar`. Register and login work without AWS configuration.

## Architecture characteristics

Target characteristics: Security, Availability, Maintainability.

- Controller layer: `src/controllers/auth.controller.js` only maps HTTP requests to application use cases and sends responses.
- Application service layer: `src/services/authApplication.service.js` coordinates register, login, refresh, logout, OTP verification, and password flows.
- Token boundary: `src/services/jwt.service.js` depends on the `TokenProvider` abstraction in `src/providers/tokenProvider.js`; the active implementation is `src/providers/jwtTokenProvider.js`.
- OTP boundary: `src/services/otp.service.js` owns OTP generation, Redis persistence, verification, attempt counting, expiry handling, and email dispatch.
- Refresh token boundary: `src/services/refreshToken.service.js` owns Redis refresh token issue, validation, TTL renewal, and revoke.
- Password boundary: `src/services/passwordEncoder.service.js` owns password hashing and password verification.
- Security filters/middleware: `src/middlewares/authenticate.js` verifies access tokens before protected routes; `src/middlewares/rateLimiter.js` delegates brute-force protection to `src/services/rateLimit.service.js`.
- Configuration boundary: `src/config/jwt.js`, `src/config/redis.js`, and `src/config/mailer.js` isolate JWT, Redis, and SMTP configuration.

Patterns used:

- Singleton: CommonJS modules are loaded once and reused as service singletons.
- Strategy: `TokenProvider` allows replacing JWT with another token provider later.
- Filter chain / decorator style: Express middlewares apply authentication, validation, rate limiting, and error handling around route handlers.
- Factory Method: `rateLimit.service.js` creates configured limiter instances through `createRateLimiter`.

## Quick overview

Endpoints

- `POST /auth/register` — send registration OTP
- `POST /auth/upload-avatar` — upload avatar image and receive an `avatarUrl`
- `POST /auth/register` — send registration OTP (can include `avatarUrl`)
- `POST /auth/register/verify` — verify OTP and create account
- `POST /auth/login` — login, returns `accessToken` + `refreshToken`
- `POST /auth/refresh` — exchange refresh token for new access token
- `POST /auth/logout` — revoke refresh token
- `POST /auth/password/forgot` — send reset OTP
- `POST /auth/password/reset` — verify reset OTP and change password
- `POST /auth/verify` — internal: verify JWT (used by API Gateway)
- `GET /health` — service health

This service expects environment variables listed below (see `src/config/env.js`).

## Environment (example `.env`)

```env
# Server
PORT=3001

# JWT (JWT_SECRET must be at least 32 characters)
JWT_SECRET=change_this_to_a_long_random_secret_at_least_32_chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis
REDIS_HOST=redis-cache
REDIS_PORT=6379
REDIS_PASSWORD=

# Shared AWS RDS variables (project-level)
RDS_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=true

# AWS S3 for avatar uploads only (optional unless you use /auth/upload-avatar)
AWS_REGION=us-east-1
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Database mapping for auth-service
DB_HOST=${RDS_HOST}
DB_PORT=${RDS_PORT}
DB_NAME=authdb
DB_USER=${RDS_USER}
DB_PASSWORD=${RDS_PASSWORD}
DB_SSL=${RDS_SSL}

# SMTP (Gmail: use App Password when using Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yourapp@gmail.com
SMTP_PASS=your_gmail_app_password

# OTP / limits
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3
PASSWORD_SALT_ROUNDS=12

# Rate limits (ms / count)
REGISTER_RATE_LIMIT_WINDOW_MS=60000
REGISTER_RATE_LIMIT_MAX=5
LOGIN_RATE_LIMIT_WINDOW_MS=60000
LOGIN_RATE_LIMIT_MAX=5
PASSWORD_RATE_LIMIT_WINDOW_MS=60000
PASSWORD_RATE_LIMIT_MAX=5
```

## Run locally

Install deps and start:

```bash
npm ci
npm start
```

Run with Docker (build + run):

```bash
docker build -t auth-service:latest .
docker run --rm -p 3001:3001 \
  -e JWT_SECRET=your_jwt_secret_here \
  -e RDS_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com -e RDS_PORT=3306 -e RDS_USER=admin -e RDS_PASSWORD=your_rds_password -e RDS_SSL=true \
  -e DB_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com -e DB_PORT=3306 -e DB_NAME=authdb -e DB_USER=admin -e DB_PASSWORD=your_rds_password -e DB_SSL=true \
  -e REDIS_HOST=redis-cache -e REDIS_PORT=6379 \
  -e SMTP_HOST=smtp.gmail.com -e SMTP_PORT=587 -e SMTP_USER=you@gmail.com -e SMTP_PASS=app_password \
  auth-service:latest
```

If you want avatar uploads, also pass `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`.

Use the root `docker-compose.yml` at the project root so auth-service and api-gateway share the same Docker network.

```bash
cd <project-root>
docker compose up --build
```

## Endpoints & example requests

- Register (send OTP)

```bash
curl -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"P@ssw0rd!","fullName":"Alice"}'
```

- Verify register (create account)

```bash
curl -X POST http://localhost:3001/auth/register/verify \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","otp":"123456"}'
```

- Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"P@ssw0rd!"}'
```

- Refresh access token

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

- Logout

```bash
curl -X POST http://localhost:3001/auth/logout \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

- Forgot password (send reset OTP)

```bash
curl -X POST http://localhost:3001/auth/password/forgot \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com"}'
```

- Reset password (verify OTP)

```bash
curl -X POST http://localhost:3001/auth/password/reset \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","otp":"123456","newPassword":"NewP@ssw0rd"}'
```

- Upload avatar image

```bash
curl -X POST http://localhost:3001/auth/upload-avatar \
  -H 'Content-Type: multipart/form-data' \
  -F 'avatar=@/path/to/avatar.jpg'
```

- Register with optional avatar URL

```bash
curl -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Alice","email":"alice@example.com","password":"P@ssw0rd!","avatarUrl":"http://localhost:3001/uploads/avatars/avatar-123.png"}'
```

- Verify token (internal — API Gateway)

```bash
curl -X POST http://localhost:3001/auth/verify \
  -H 'Content-Type: application/json' \
  -d '{"token":"<ACCESS_TOKEN>"}'
```

## Database changes

Add the new avatar URL column to the `users` table:

```sql
ALTER TABLE users
ADD COLUMN avatar_url VARCHAR(512) NULL AFTER full_name;
```

Store only the image URL in the database, and save the uploaded file under `uploads/avatars/` in the auth service.

## Notes & operational guidance

- `JWT_SECRET` must be at least **32 characters**. Use a secure random string in production.
- For Gmail, enable 2FA and create an **App Password** to use as `SMTP_PASS`.
- `Redis` is required for OTPs and refresh token storage; ensure `REDIS_HOST`/`REDIS_PORT` point to a running Redis instance.
- `DB_*` variables configure the MySQL connection (RDS): `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. SSL can be enabled with `DB_SSL=true`.
- AWS S3 variables are optional unless you use avatar upload.
- Health check URL: `GET /health` returns `{ status: "ok" }`.

## Troubleshooting

- If OTPs are not delivered, check SMTP credentials and network access (port 587). Use Mailtrap for dev testing.
- If app fails to start with `JWT_SECRET` error, ensure the secret is set and long enough.

If you want, I can also add example Postman collection or a tiny smoke test script.
