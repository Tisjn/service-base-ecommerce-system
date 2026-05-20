# 🚀 Deployment & Testing Guide

**Last Updated:** May 20, 2026  
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Docker Compose Deployment](#docker-compose-deployment)
3. [Service-by-Service Testing](#service-by-service-testing)
4. [End-to-End Workflow Testing](#end-to-end-workflow-testing)
5. [Troubleshooting](#troubleshooting)
6. [Performance Monitoring](#performance-monitoring)

---

## Local Development Setup

### Prerequisites

- Node.js 20+ (for Node-based services)
- Java 21 (for Spring Boot services)
- Docker & Docker Compose
- Maven (for Java builds)
- Git

### Environment Configuration

Create `.env` files in project root:

```env
# Shared AWS RDS MySQL
RDS_HOST=database-1-instance-1.cvwyy4mmuaiw.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=false

# Redis (Docker or local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ (Docker or local)
SPRING_RABBITMQ_HOST=localhost
SPRING_RABBITMQ_PORT=5672
SPRING_RABBITMQ_USERNAME=guest
SPRING_RABBITMQ_PASSWORD=guest

# Auth Service
JWT_SECRET=your_long_random_secret_at_least_32_characters_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourapp@gmail.com
SMTP_PASS=your_gmail_app_password

# Google AI (optional for AI service)
GOOGLE_AI_API_KEY=your_google_ai_key

# MoMo Payment (optional for payment service)
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=your_momo_key
MOMO_SECRET_KEY=your_momo_secret
```

### Starting Services Locally

#### Option 1: Individual Terminals

**Terminal 1 - Auth Service (3001)**

```bash
cd services/auth-service
npm ci
npm start
```

**Terminal 2 - User Service (3002)**

```bash
cd services/user-service
mvn spring-boot:run
```

**Terminal 3 - Product Service (3003)**

```bash
cd services/product-service
mvn spring-boot:run
```

**Terminal 4 - Order Service (3004)**

```bash
cd services/order-service
mvn spring-boot:run
```

**Terminal 5 - Payment Service (3005)**

```bash
cd services/payment-service
mvn spring-boot:run
```

**Terminal 6 - Chat Service (3007)**

```bash
cd services/chat-service
npm ci
npm start
```

**Terminal 7 - AI Service (3009)**

```bash
cd services/ai-service
mvn spring-boot:run
```

**Terminal 8 - API Gateway (3000)**

```bash
cd services/api-gateway
npm ci
npm start
```

**Terminal 9 - Frontend (5173)**

```bash
cd frontend
npm ci
npm run dev
```

#### Option 2: Docker Compose (Recommended)

```bash
docker-compose up -d --build
```

This starts all services + Redis + RabbitMQ + MySQL containers.

---

## Docker Compose Deployment

### docker-compose.yml Structure

```yaml
version: "3.8"
services:
  # Database
  mysql:
    image: mysql:8
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: ecommerce_data

  # Cache & Message Queue
  redis:
    image: redis:7
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"

  # Services
  auth-service:
    build: ./services/auth-service
    ports:
      - "3001:3001"
    depends_on:
      - mysql
      - redis

  user-service:
    build: ./services/user-service
    ports:
      - "3002:3002"
    depends_on:
      - mysql

  product-service:
    build: ./services/product-service
    ports:
      - "3003:3003"
    depends_on:
      - mysql
      - redis

  order-service:
    build: ./services/order-service
    ports:
      - "3004:3004"
    depends_on:
      - mysql
      - redis
      - rabbitmq

  payment-service:
    build: ./services/payment-service
    ports:
      - "3005:3005"
    depends_on:
      - mysql

  chat-service:
    build: ./services/chat-service
    ports:
      - "3007:3007"

  ai-service:
    build: ./services/ai-service
    ports:
      - "3009:3009"
    depends_on:
      - mysql

  api-gateway:
    build: ./services/api-gateway
    ports:
      - "3000:3000"
    depends_on:
      - auth-service
      - user-service
      - product-service
      - order-service
      - payment-service
      - chat-service
      - ai-service

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - api-gateway
```

### Deploy to Docker

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Stop all
docker-compose down

# Clean up (remove volumes)
docker-compose down -v
```

---

## Service-by-Service Testing

### 1. Auth Service (3001)

#### Health Check

```bash
curl http://localhost:3001/health
```

#### Register User

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### Verify OTP & Create Account

```bash
curl -X POST http://localhost:3001/auth/register/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "password": "SecurePass@123"
  }'
```

#### Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass@123"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900,
  "userId": "usr_12345",
  "email": "test@example.com"
}
```

---

### 2. Product Service (3003)

#### List Products

```bash
curl http://localhost:3003/api/products?page=0&size=10
```

#### Get Product Details

```bash
curl http://localhost:3003/api/products/1
```

#### Get Categories

```bash
curl http://localhost:3003/api/categories
```

#### Add to Cart (Guest)

```bash
curl -X POST http://localhost:3003/api/cart/guest:session123/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "quantity": 2
  }'
```

#### Get Cart

```bash
curl http://localhost:3003/api/cart/guest:session123
```

---

### 3. Order Service (3004)

#### Create Order (Authenticated)

```bash
curl -X POST http://localhost:3004/api/orders \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": "123 Main St, HCM",
    "paymentMethod": "MOMO"
  }'
```

#### Get My Orders

```bash
curl http://localhost:3004/api/orders \
  -H "Authorization: Bearer <accessToken>"
```

#### Merge Guest Cart to User Cart

```bash
curl -X POST http://localhost:3004/api/cart/usr_12345/merge \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "guestToken": "guest:session123"
  }'
```

---

### 4. Payment Service (3005)

#### Create Payment

```bash
curl -X POST http://localhost:3005/payments \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 12345,
    "paymentMethod": "MOMO",
    "amount": 2400.00,
    "orderInfo": "Payment for order"
  }'
```

#### Get Payment Details

```bash
curl http://localhost:3005/payments/pay_12345 \
  -H "Authorization: Bearer <accessToken>"
```

---

### 5. User Service (3002)

#### Get My Profile

```bash
curl http://localhost:3002/api/users/me \
  -H "Authorization: Bearer <accessToken>"
```

#### Update Profile

```bash
curl -X PATCH http://localhost:3002/api/users/me \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "phone": "+84912345678"
  }'
```

#### List Users (Admin)

```bash
curl http://localhost:3002/api/users \
  -H "Authorization: Bearer <adminToken>"
```

---

### 6. Chat Service (3007)

#### List Conversations

```bash
curl http://localhost:3007/chat/conversations \
  -H "Authorization: Bearer <accessToken>"
```

#### Create Conversation

```bash
curl -X POST http://localhost:3007/chat/conversations \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "participantIds": ["usr_67890"]
  }'
```

---

### 7. AI Service (3009)

#### Ask Assistant

```bash
curl -X POST http://localhost:3009/api/ai/ask \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Đơn hàng gần nhất của tôi ở trạng thái nào?"
  }'
```

---

## End-to-End Workflow Testing

### Scenario 1: Guest Checkout Flow

```bash
# 1. Get products (no auth needed)
curl http://localhost:3000/api/products

# 2. Add to cart as guest (session-based)
curl -X POST http://localhost:3000/api/cart/guest:session123/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "quantity": 2
  }'

# 3. View cart
curl http://localhost:3000/api/cart/guest:session123

# 4. Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "firstName": "New",
    "lastName": "User"
  }'

# 5. Verify OTP & create account
curl -X POST http://localhost:3000/auth/register/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "otp": "123456",
    "password": "SecurePass@123"
  }'

# 6. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass@123"
  }' > login_response.json

# Extract token from response
TOKEN=$(jq -r '.accessToken' login_response.json)

# 7. Merge guest cart to user cart
curl -X POST "http://localhost:3000/api/cart/usr_<new_id>/merge" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "guestToken": "guest:session123"
  }'

# 8. Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": "123 Main St, HCM",
    "paymentMethod": "MOMO"
  }' > order_response.json

ORDER_ID=$(jq -r '.orderId' order_response.json)

# 9. Create payment
curl -X POST http://localhost:3000/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"paymentMethod\": \"MOMO\",
    \"amount\": 2400.00,
    \"orderInfo\": \"Payment for order\"
  }"

# 10. Check order status
curl "http://localhost:3000/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Scenario 2: Customer Profile & Chat

```bash
# 1. Login (from previous scenario)
TOKEN=<accessToken>

# 2. View profile
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN"

# 3. Update profile
curl -X PATCH http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+84912345678",
    "address": "456 Oak Ave, Da Nang"
  }'

# 4. Start chat with support
curl -X POST http://localhost:3000/chat/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "participantIds": ["support_team"]
  }' > conversation_response.json

CONV_ID=$(jq -r '.id' conversation_response.json)

# 5. Send message
curl -X POST http://localhost:3000/chat/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONV_ID\",
    \"text\": \"Where is my order?\"
  }"

# 6. Ask AI assistant
curl -X POST http://localhost:3000/ai/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Đơn hàng của tôi đang ở đâu?"
  }'
```

### Scenario 3: Admin Operations

```bash
# 1. Login as admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPass@123"
  }' > admin_login.json

ADMIN_TOKEN=$(jq -r '.accessToken' admin_login.json)

# 2. List all users
curl http://localhost:3000/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3. View user details
curl http://localhost:3000/users/usr_12345 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 4. List all orders
curl http://localhost:3000/admin/orders \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 5. Update order status
curl -X PATCH http://localhost:3000/admin/orders/ord_12345/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SHIPPED"
  }'

# 6. Create product
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Product",
    "description": "Premium item",
    "categoryId": 1,
    "price": 99.99,
    "stock": 100
  }'

# 7. Update product
curl -X PATCH http://localhost:3000/api/products/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 89.99,
    "stock": 50
  }'
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port
lsof -i :3000
# Kill process
kill -9 <PID>
```

#### 2. Database Connection Failed

```bash
# Check MySQL
mysql -h localhost -u admin -p

# Check Redis
redis-cli ping
```

#### 3. JWT Token Expired

```bash
# Use refresh token to get new access token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

#### 4. CORS Error in Frontend

**Solution:** Ensure API Gateway has CORS middleware enabled:

```javascript
const corsMiddleware = cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
```

#### 5. WebSocket Connection Failed

**Solution:** Ensure WebSocket support in API Gateway:

```javascript
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});
```

#### 6. Cart Data Not Syncing

**Checklist:**

- Redis is running: `redis-cli ping`
- Cart item added before merge
- Guest token is consistent
- Clear Redis cache if needed: `redis-cli FLUSHDB`

---

## Performance Monitoring

### Health Check Endpoints

```bash
# Gateway health
curl http://localhost:3000/health

# Individual services
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/api/health  # User
curl http://localhost:3003/api/health  # Product
curl http://localhost:3004/api/health  # Order
curl http://localhost:3005/api/health  # Payment
curl http://localhost:3007/chat/health  # Chat
curl http://localhost:3009/api/health  # AI
```

### Monitoring Tools

#### Docker Resource Usage

```bash
docker stats
```

#### View Service Logs

```bash
docker-compose logs -f <service-name>
```

#### Database Connections

```sql
-- MySQL
SELECT * FROM information_schema.processlist;

-- Check table sizes
SELECT
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS `Size in MB`
FROM information_schema.tables
WHERE table_schema = 'ecommerce_data';
```

#### Redis Memory Usage

```bash
redis-cli INFO memory
```

#### RabbitMQ Management UI

```
http://localhost:15672
Username: guest
Password: guest
```

### Performance Optimization Tips

1. **Enable Product Cache:** Reduces database queries
2. **Set Appropriate Redis TTL:** 24h for cart, 1h for product cache
3. **Paginate Results:** Always use pagination for list endpoints
4. **Index Frequently Queried Fields:** User ID, Product ID, Created Date
5. **Monitor RabbitMQ Queue Depth:** Check if consumers are keeping up

---

## Deployment Checklist

- [ ] All services passing health checks
- [ ] Environment variables configured
- [ ] Database schema initialized
- [ ] Redis cache operational
- [ ] RabbitMQ running and accessible
- [ ] All integration tests passing
- [ ] Load testing completed
- [ ] Security audit done
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place

---
