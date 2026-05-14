# Testing Auth Service

This document describes how to test the auth-service and all its endpoints.

## Prerequisites

### Option 1: Local Run (Recommended for quick health check)

- Node.js 20+
- npm dependencies installed: `npm install --only=production`
- `.env` file configured (see [README.md](README.md))

### Option 2: Docker Compose (Full integration test)

- Docker & Docker Compose installed
- Redis and MySQL running in containers

---

## Quick Test: Health Check (No dependencies required)

### 1. Start the service

```bash
cd services/auth-service
npm start
```

You should see:

```json
{
  "level": "info",
  "message": "auth-service listening on port 3001",
  "timestamp": "..."
}
```

### 2. Test health endpoint

```bash
curl -X GET http://localhost:3001/health
```

Expected response:

```json
{ "status": "ok" }
```

✅ **If you see this, the service is running correctly!**

---

## Full Integration Test (with Docker Compose)

This tests the complete workflow with MySQL + Redis.

### 1. Setup and start services

```bash
cd <project-root>
docker compose up --build
```

Wait for all containers to be ready. You should see:

```
auth-service  | {"level":"info","message":"auth-service listening on port 3001",...}
```

### 2. Check health

```bash
curl http://localhost:3001/health
```

### 3. Test Registration Flow (2-step OTP)

**Step 1: Send OTP**

```bash
curl -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!",
    "fullName": "Alice Wonder"
  }'
```

Expected response:

```json
{ "message": "OTP sent to your email" }
```

**Note**: The OTP email is sent to the configured SMTP address. For testing:

- If using Gmail, check your email inbox
- If using Mailtrap (dev), check the Mailtrap inbox

**Get the OTP**: Check your email for the 6-digit code (or check Mailtrap inbox)

**Step 2: Verify OTP and create account**

```bash
curl -X POST http://localhost:3001/auth/register/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "alice@example.com",
    "otp": "123456"
  }'
```

Expected response:

```json
{ "message": "Registration successful" }
```

✅ User account created with `status: 'active'`

### 4. Test Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!"
  }'
```

Expected response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "alice@example.com",
    "role": "customer"
  }
}
```

Save both tokens for next tests.

### 5. Test Refresh Token

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{
    "refreshToken": "<REFRESH_TOKEN_FROM_LOGIN>"
  }'
```

Expected response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

✅ New access token issued (old one still valid until expires)

### 6. Test Verify Token (API Gateway internal)

```bash
curl -X POST http://localhost:3001/auth/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "<ACCESS_TOKEN>"
  }'
```

Expected response:

```json
{
  "sub": 1,
  "email": "alice@example.com",
  "role": "customer",
  "iat": 1715170000,
  "exp": 1715170900
}
```

✅ Token verified (API Gateway can use this)

### 7. Test Logout

```bash
curl -X POST http://localhost:3001/auth/logout \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

Expected response:

```json
{ "message": "Logged out successfully" }
```

✅ Refresh token revoked (user can't refresh anymore)

### 8. Test Forgot Password Flow (2-step OTP)

**Step 1: Request reset OTP**

```bash
curl -X POST http://localhost:3001/auth/password/forgot \
  -H 'Content-Type: application/json' \
  -d '{"email": "alice@example.com"}'
```

Expected response:

```json
{ "message": "Reset OTP sent to your email" }
```

**Step 2: Verify OTP and reset password**

```bash
curl -X POST http://localhost:3001/auth/password/reset \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "alice@example.com",
    "otp": "654321",
    "newPassword": "NewSecurePass456!"
  }'
```

Expected response:

```json
{ "message": "Password changed successfully. Please log in again" }
```

✅ Password updated + all refresh tokens revoked (forced logout)

### 9. Test Rate Limiting

Try registering 6 times from the same IP within 1 minute:

```bash
for i in {1..6}; do
  curl -X POST http://localhost:3001/auth/register \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"test$i@example.com\",\"password\":\"Pass123!\",\"fullName\":\"Test$i\"}"
  echo ""
  sleep 1
done
```

On the 6th request, you should see:

```json
{ "error": "Too many requests. Please try again in 1 minute" }
```

✅ Rate limiter working (max 5 per minute)

---

## Error Scenarios to Test

### Invalid Email Format

```bash
curl -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "not-an-email",
    "password": "Pass123!",
    "fullName": "Test"
  }'
```

Expected: `400 Bad Request` — invalid email format

### Weak Password

```bash
curl -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "alice@example.com",
    "password": "weak",
    "fullName": "Test"
  }'
```

Expected: `400 Bad Request` — password too short (min 8 chars)

### Duplicate Email

Register twice with same email:

```bash
curl -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "alice@example.com",
    "password": "Pass123!",
    "fullName": "Alice"
  }'
```

Expected: `409 Conflict` — email already exists

### Invalid OTP

```bash
curl -X POST http://localhost:3001/auth/register/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "alice@example.com",
    "otp": "000000"
  }'
```

Expected: `400 Bad Request` — invalid OTP

### Wrong Password at Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "alice@example.com",
    "password": "WrongPassword"
  }'
```

Expected: `401 Unauthorized` — invalid credentials

---

## Redis CRUD Verification

To verify Redis CRUD operations (for grading):

### Check OTP in Redis (during registration)

```bash
redis-cli
> GET otp:register:alice@example.com
```

Expected: JSON with OTP, hashed password, full name

```json
{
  "otp": "123456",
  "hashedPassword": "$2a$12$...",
  "fullName": "Alice",
  "attempts": 0
}
```

✅ **CREATE** (SET): OTP stored with TTL 300s
✅ **READ** (GET): Data retrieved  
✅ **UPDATE** (SET): Attempts field updated on wrong OTP
✅ **DELETE** (DEL): Removed after successful verify

### Check Refresh Token in Redis (after login)

```bash
redis-cli
> GET refresh:1
```

Expected: The refresh token string with TTL 604800s (7 days)

✅ All 4 CRUD operations demonstrated

---

## Summary Checklist

Use this checklist to verify all flows:

- [ ] Health endpoint responds (`GET /health`)
- [ ] Register OTP sent (`POST /auth/register`)
- [ ] OTP verified, account created (`POST /auth/register/verify`)
- [ ] Login returns JWT tokens (`POST /auth/login`)
- [ ] Refresh returns new access token (`POST /auth/refresh`)
- [ ] Verify JWT works (`POST /auth/verify`)
- [ ] Logout revokes refresh token (`POST /auth/logout`)
- [ ] Forgot password sends OTP (`POST /auth/password/forgot`)
- [ ] Password reset works (`POST /auth/password/reset`)
- [ ] Rate limiting works (6th request in 1 min rejected)
- [ ] Redis CRUD operations verified (OTP + refresh token)
- [ ] Error handling works (400, 401, 409 responses)

---

## Troubleshooting

### Service won't start

Check `.env` file — ensure `JWT_SECRET` is >= 32 chars:

```bash
# Generate a strong secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Redis/MySQL connection errors

- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Ensure MySQL is reachable: `mysql -h <DB_HOST> -u <DB_USER> -p` with your password
- For RDS: check security group allows port 3306

### OTP emails not arriving

- For Gmail: ensure App Password is set correctly
- For Mailtrap: check Mailtrap inbox (it's free for dev testing)
- Check logs: `docker logs auth-service` for SMTP errors

---
