# Auth Service (Node.js)

Lightweight authentication microservice for ShopNova - OTP via SMTP, JWT access + refresh, Redis for OTP and refresh tokens, MySQL (RDS) for users.

## Quick overview

Endpoints

- `POST /auth/register` — send registration OTP
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

# Database (MySQL / RDS)
DB_HOST=mysql
DB_PORT=3306
DB_NAME=authdb
DB_USER=root
DB_PASSWORD=password
DB_SSL=false

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
  -e DB_HOST=mysql -e DB_PORT=3306 -e DB_NAME=authdb -e DB_USER=root -e DB_PASSWORD=secret \
  -e REDIS_HOST=redis-cache -e REDIS_PORT=6379 \
  -e SMTP_HOST=smtp.gmail.com -e SMTP_PORT=587 -e SMTP_USER=you@gmail.com -e SMTP_PASS=app_password \
  auth-service:latest
```

Or use the included `docker-compose.yml`:

```bash
cd services/auth-service
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

- Verify token (internal — API Gateway)

```bash
curl -X POST http://localhost:3001/auth/verify \
  -H 'Content-Type: application/json' \
  -d '{"token":"<ACCESS_TOKEN>"}'
```

## Notes & operational guidance

- `JWT_SECRET` must be at least **32 characters**. Use a secure random string in production.
- For Gmail, enable 2FA and create an **App Password** to use as `SMTP_PASS`.
- `Redis` is required for OTPs and refresh token storage; ensure `REDIS_HOST`/`REDIS_PORT` point to a running Redis instance.
- `DB_*` variables configure the MySQL connection (RDS): `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. SSL can be enabled with `DB_SSL=true`.
- Health check URL: `GET /health` returns `{ status: "ok" }`.

## Troubleshooting

- If OTPs are not delivered, check SMTP credentials and network access (port 587). Use Mailtrap for dev testing.
- If app fails to start with `JWT_SECRET` error, ensure the secret is set and long enough.

If you want, I can also add example Postman collection or a tiny smoke test script.
