# 📋 Services Documentation - Complete System Reference

**Last Updated:** May 20, 2026  
**Status:** ✅ Synchronized with actual implementations

---

## 🏗️ System Architecture Overview

DTPShop is a **Service-Based E-Commerce System** with 8 microservices:

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                        │
│                      :5173 (Vite Dev Server)                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP/WebSocket
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (Express)                        │
│                        :3000 (Port)                              │
│   JWT Verification • Rate Limiting • Route Proxying              │
└─────────┬─────────┬─────────┬────────┬────────┬────────┬────────┘
          │         │         │        │        │        │
      Auth  │     User    │   Product │ Payment │ Order  │ Chat   │ AI
      Port  │     Port    │   Port    │ Port    │ Port   │ Port   │ Port
      3001  │     3002    │   3003    │ 3005    │ 3004   │ 3007   │ 3009
          │         │         │        │        │        │
┌─────────▼───┐ ┌──▼────┐ ┌──▼───┐ ┌─▼────┐ ┌──▼────┐ ┌▼────┐ ┌▼──┐
│ Auth Srvc   │ │User   │ │Prod  │ │Paym  │ │Order  │ │Chat │ │AI │
│  (Node.js)  │ │(S.Boot)│ │(S.B) │ │(S.B) │ │(S.B)  │ │(N.js)│ │(J)│
└────┬────────┘ └───┬───┘ └──┬───┘ └──┬───┘ └───┬───┘ └──┬──┘ └┬──┘
     │ JWT         │        │       │        │       │    │
     │ + OTP       │        │       │        │       │    │
     │             │        │       │        │       │    │
┌────▼─────────────▼────────▼───────▼───────▼───────▼───┐ │
│          AWS RDS MySQL (ecommerce_data)              │ │
│  authdb│userdb│productdb│paymentdb│orderdb           │ │
└────────────────────────────────────────────────────────┘ │
                                                           │
         Redis (Cache/Session)  RabbitMQ (Events)  DynamoDB (Chat)
         ├─ Product Cache       ├─ Order Events     ├─ Messages
         ├─ Cart Data           └─ Notifications   └─ File Storage
         └─ Session/OTP
```

---

## 📦 Services Catalog

### 1️⃣ **Auth Service** (Node.js)

**Port:** 3001  
**Purpose:** User identity & authentication  
**Tech:** Express.js + JWT + OTP + Redis + MySQL (authdb)

#### Key Functions

- **User Registration:** Email verification via OTP (SMTP)
- **User Login:** JWT + Refresh Token generation
- **Token Refresh:** Exchange refresh token for new access token
- **Logout:** Revoke refresh tokens
- **Password Reset:** OTP-based password recovery
- **Avatar Upload:** AWS S3 integration (optional)
- **JWT Verification:** Internal endpoint for API Gateway

#### Routes

```
POST   /auth/register           - Send registration OTP
POST   /auth/register/verify    - Verify OTP & create account
POST   /auth/login              - Login (returns JWT + refresh token)
POST   /auth/refresh            - Get new access token
POST   /auth/logout             - Revoke refresh token
POST   /auth/password/forgot    - Send password reset OTP
POST   /auth/password/reset     - Verify OTP & reset password
POST   /auth/upload-avatar      - Upload avatar to S3
POST   /auth/verify             - [Internal] Verify JWT for gateway
GET    /health                  - Health check
```

---

### 2️⃣ **User Service** (Spring Boot)

**Port:** 3002  
**Purpose:** User profile management (post-authentication)  
**Tech:** Spring Boot 3.x + Java 21 + JPA + MySQL (userdb)

#### Key Functions

- **Profile View:** Get own profile or admin view all users
- **Profile Update:** Customers update their info; admins manage users
- **Account Lock/Unlock:** Admin controls user account status
- **Account Deletion:** Soft delete (only if no orders placed)
- **User Listing:** Admin only; no password exposure

#### Routes

```
GET    /users/me               - Get current user profile
PATCH  /users/me               - Update own profile
GET    /users                  - [Admin] List all users
GET    /users/{id}             - [Admin] Get user details
PATCH  /users/{id}/status      - [Admin] Lock/unlock account
DELETE /users/{id}             - [Admin] Soft delete user
```

---

### 3️⃣ **Product Service** (Spring Boot)

**Port:** 3003  
**Purpose:** Product catalog & inventory management  
**Tech:** Spring Boot 3.x + Java 21 + JPA + Redis + MySQL (productdb)

**C3 Space-based flow:** [PRODUCT_SERVICE_SPACE_BASED_C3.md](PRODUCT_SERVICE_SPACE_BASED_C3.md)

#### Key Functions

- **Product Listing:** Paginated, searchable, filterable
- **Product Details:** Cache-aside pattern with Redis
- **Image Upload:** Upload product images to S3-compatible storage
- **Cart Management:** Guest/user cart via `/api/cart/*`, synchronized to `order-service`
- **Inventory Reserve:** Reserve stock through `/api/inventory/reserve`
- **Inventory Refund:** Return reserved stock through `/api/inventory/refund`
- **Category Management:** CRUD operations for product categories
- **Product Lifecycle:** Soft delete, restore, and permanent delete
- **Stock Validation:** Check availability before checkout

#### Routes

```
GET    /api/products                      - List products (paginated, filterable)
GET    /api/products/{id}                 - Get product details
POST   /api/product-images                - Upload product image
POST   /api/products                      - [Admin] Create product
PATCH  /api/products/{id}                 - [Admin] Update product
DELETE /api/products/{id}                 - [Admin] Delete product
PATCH  /api/products/{id}/restore         - [Admin] Restore product
DELETE /api/products/{id}/permanent       - [Admin] Permanently delete product
PATCH  /api/products/{id}/stock           - [Admin] Update stock

GET    /api/categories                    - List categories
POST   /api/categories                    - [Admin] Create category
PATCH  /api/categories/{id}               - [Admin] Update category
DELETE /api/categories/{id}               - [Admin] Delete category

GET    /api/cart/{userId}                 - Get cart items for guest/user
POST   /api/cart/{userId}/items           - Add item to cart
PATCH  /api/cart/{userId}/items/{productId} - Update quantity
DELETE /api/cart/{userId}/items/{productId} - Remove item
DELETE /api/cart/{userId}                 - Clear entire cart
POST   /api/cart/merge                    - Merge guest cart to authenticated user cart
POST   /api/cart/{userId}/checkout        - Checkout (reserve inventory)

POST   /api/inventory/reserve             - [Order Svc] Reserve stock
POST   /api/inventory/refund              - [Order Svc] Refund stock
```

#### Query Parameters

- **Pagination:** `?page=0&size=20`
- **Filter by Category:** `?categoryId=1`
- **Filter by Status:** `?status=active`
- **Search:** `?search=keyword`
- **Price Range:** `?minPrice=100&maxPrice=5000`
- **Sorting:** `?sortBy=name|price|stock|createdAt&direction=asc|desc`

---

### 4️⃣ **Order Service** (Spring Boot)

**Port:** 3004  
**Purpose:** Order orchestration & cart management  
**Tech:** Spring Boot 3.x + Java 21 + RabbitMQ + JPA + MySQL (orderdb) + Redis + WebSocket

#### Key Functions

- **Guest Cart Management:** Session-based cart in Redis (24h TTL)
- **Cart Merge:** Merge guest cart with user cart after login
- **Order Creation:** Orchestrates payment, inventory, notifications
- **Order Tracking:** Real-time status updates via WebSocket
- **Order Cancellation:** Refunds inventory & notifies
- **Event Publishing:** Publishes events to RabbitMQ for async tasks

#### Workflow

```
POST /api/cart/items or /api/orders
    ↓
OrderController.resolveCartKey(HttpSession)
    ├─ Guest: "guest:<sessionId>"
    └─ User: "<userId>"
    ↓
CartService.add/update/remove/clear/merge() → Redis
    ↓
[Optional] OrderService.createOrder()
    ├─→ Save PENDING order in MySQL
    ├─→ ProductService.reserveInventory()
    ├─→ PaymentService.createPayment()
    ├─→ EventPublisher.publishOrderCreated() → RabbitMQ
    ├─→ WebSocket: notifyNewOrder()
    ├─→ CartService.clearCart() → Redis DELETE
    └─→ EmailService.sendOrderPlacedEmail() → SMTP
```

#### Routes

```
POST   /api/cart/items                    - Add item (guest/user)
GET    /api/cart                          - Get cart
PATCH  /api/cart/items/{productId}        - Update quantity
DELETE /api/cart/items/{productId}        - Remove item
DELETE /api/cart                          - Clear cart
POST   /api/cart/session/login            - Merge guest cart into user cart
POST   /api/cart/session/logout           - Unlink current user from session

POST   /api/orders                        - [Customer] Create order
POST   /api/orders/{userId}               - [Customer] Create order for user
GET    /api/orders                        - [Customer] List orders (or paged when filters are provided)
GET    /api/orders/user/{userId}          - [Customer] List orders by user
GET    /api/orders/{orderId}              - Get order details
GET    /api/orders/{orderId}/comments     - Get product comments for order
GET    /api/orders/products/{productId}/details - Get product detail for an order context
POST   /api/orders/users/{userId}/products/{productId}/comments - Add product comment
PATCH  /api/orders/{orderId}/status       - [Admin] Update status
DELETE /api/orders/{orderId}/cancel       - Cancel order

[WebSocket] /ws/orders                    - Real-time order updates
[RabbitMQ] order.created                  - Order creation event
[RabbitMQ] order.cancelled                - Cancellation event
```

---

### 5️⃣ **Payment Service** (Spring Boot)

**Port:** 3005  
**Purpose:** Payment processing & transaction management  
**Tech:** Spring Boot 3.x + Java 21 + MoMo API + MySQL (paymentdb)

#### Key Functions

- **Payment Creation:** Generate payment links for MoMo or COD
- **MoMo Integration:** Sandbox payment gateway
- **COD (Cash on Delivery):** Create payment record for later collection
- **Webhook Handling:** Verify & process MoMo payment callbacks
- **Payment Status:** Query and manage payment records

#### Routes

```
POST   /payments                          - Create payment
GET    /payments                          - List payments
GET    /payments?orderId=X                - Filter by order
GET    /payments/{id}                     - Get payment details
PATCH  /payments/{id}/cod-paid            - Mark COD as paid
POST   /payments/webhook/momo             - MoMo callback handler
```

---

### 6️⃣ **Chat Service** (Node.js)

**Port:** 3007  
**Purpose:** Real-time messaging & file sharing  
**Tech:** Express.js + Socket.io + Multer + DynamoDB + AWS S3

#### Key Functions

- **Direct Messaging:** One-to-one chat between users
- **Group Chat:** Multiple users in conversation
- **File Upload/Download:** Attach files to messages
- **Message History:** Retrieve conversation history
- **Real-time Updates:** WebSocket-based instant messaging
- **User Presence:** Online/offline status tracking

#### Routes

```
GET    /chat/conversations                - List user's conversations
POST   /chat/conversations                - Create new conversation
GET    /chat/conversations/{id}/messages  - Get message history
POST   /chat/messages                     - Send message
POST   /uploads                           - Upload file
[WebSocket] /chat                         - Real-time messaging
```

---

### 7️⃣ **AI Service** (Spring Boot)

**Port:** 3009  
**Purpose:** Customer support assistant powered by Google Gemini  
**Tech:** Spring Boot 3.x + Java 21 + Google Gemini API + MySQL

#### Key Functions

- **Question Answering:** Answer customer queries using context
- **Filtered Context:** Access to products, categories, own orders only
- **Vietnamese Response:** Answers in Vietnamese language
- **Context Summary:** Debug endpoint for testing

#### Security Model

- Only reads safe database tables with user filtering:
  - `products`
  - `categories`
  - `orders` (own only)
  - `order_items` (own only)
  - `faq_policy`
- No SQL generation allowed; only fixed queries
- Requires `X-User-Id` header (injected by API Gateway)

#### Routes

```
POST   /api/ai/ask                        - Ask assistant question
GET    /api/ai/summary                    - Get filtered context (debug)
GET    /api/ai/health                     - Health check
```

---

### 8️⃣ **API Gateway** (Express.js)

**Port:** 3000  
**Purpose:** Single entry point for all services  
**Tech:** Express.js + JWT verification + Rate limiting + HTTP Proxy Middleware

#### Key Responsibilities

- **Request Routing:** Direct requests to appropriate microservice
- **JWT Verification:** Validate access tokens from auth-service
- **Optional Auth:** Some routes allow unauthenticated access
- **Rate Limiting:** Protect against abuse
- **CORS:** Enable cross-origin requests from frontend

#### Routes Proxy

```
/auth                    → Auth Service (3001)
/users                   → User Service (3002)
/api/products            → Product Service (3003)
/cart                    → Order Service (3004)
/orders                  → Order Service (3004)
/payments                → Payment Service (3005)
/chat                    → Chat Service (3007)
/ai                      → AI Service (3009)
```

#### Authentication Types

- **No Auth:** `POST /auth/register`, `POST /auth/login`, `GET /api/products`
- **Optional Auth:** Cart operations (guest or user)
- **Required Auth:** User profile, orders, payments, AI, chat

---

## 🔄 Data Synchronization Patterns

### Cross-Service Communication

#### 1. **Synchronous (HTTP Client)**

- `order-service` → `product-service` (reserve/refund inventory)
- `order-service` → `payment-service` (create payment)
- `gateway` → `auth-service` (verify JWT)

### 2. **Cart Synchronization**

- `product-service` syncs guest/user cart changes to `order-service` via HTTP client.
- `order-service` stores the working cart in Redis and merges guest cart to user cart on login/checkout.

### 3. **Asynchronous (RabbitMQ Events)**

- `order-service` publishes `order.created` → email service, notifications
- `order-service` publishes `order.cancelled` → refund process
- `payment-service` webhook → update order status

### 4. **Data Caching (Redis)**

- **Product Cache:** Cache-aside pattern, invalidated on update
- **Cart Storage:** Guest carts stored with 24h TTL
- **Session Data:** OTP, refresh tokens stored temporarily

---

## 🗄️ Database Schema Distribution

| Service         | Database                   | Port | Tables                            |
| --------------- | -------------------------- | ---- | --------------------------------- |
| auth-service    | authdb                     | 3001 | users, otp_logs, refresh_tokens   |
| user-service    | userdb                     | 3002 | users, profiles                   |
| product-service | productdb                  | 3003 | products, categories, inventories |
| order-service   | orderdb                    | 3004 | orders, order_items, cart_items   |
| payment-service | paymentdb                  | 3005 | payments, transactions            |
| chat-service    | DynamoDB                   | 3007 | conversations, messages           |
| ai-service      | ecommerce_data (read-only) | 3009 | faq_policy, + read-only views     |

**Shared Database:** All services can read from `ecommerce_data` (common schema)

---

## 🔐 Security Layers

### 1. **Authentication (Auth Service)**

- Email + OTP registration
- JWT access token (15 min expiration)
- Refresh token (7 days)
- Password hashing (bcrypt 12 rounds)

### 2. **Authorization (API Gateway)**

- `verifyJWT()` - Requires valid access token
- `optionalVerifyJWT()` - Guest/user accepted
- `requireOrderAuth()` - Customer or admin only
- `requireAuthForWrites()` - Only authenticated users can modify

### 3. **Data Isolation**

- Guest cart: Session ID + isolation
- User orders: User ID filtering
- Admin only: Role-based checks at gateway

### 4. **Rate Limiting**

- Server-level rate limit
- Endpoint-specific limits (registration, login, password reset)

---

## 🚀 Deployment & Environment

### Environment Variables (Unified Approach)

**AWS RDS (Shared)**

```env
RDS_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=true
```

**Redis (Shared)**

```env
REDIS_HOST=redis-cache
REDIS_PORT=6379
REDIS_PASSWORD=
```

**RabbitMQ (Shared)**

```env
SPRING_RABBITMQ_HOST=rabbitmq
SPRING_RABBITMQ_PORT=5672
SPRING_RABBITMQ_USERNAME=guest
SPRING_RABBITMQ_PASSWORD=guest
```

**Service-Specific** (see individual service docs)

### Docker Compose

All services include `docker-compose.yml` for local development:

```bash
docker-compose up --build
```

---

## 📊 Performance Optimization

### Caching Strategy

- **Redis Cache-Aside:** Products cached, invalidated on write
- **Cart Sessions:** Guest carts in Redis (24h TTL)
- **Refresh Token Storage:** Redis for quick validation

### Pagination

- Default page size: 20 items
- Maximum configurable per request

### Database Indexing

- User ID indexes on orders, profiles
- Product ID indexes on cart items, inventory
- Created date indexes for sorting

---

## 🧪 Testing & Validation

### Health Checks

```bash
# All services
GET /health

# Gateway
curl http://localhost:3000/health
```

### Sample Requests

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for detailed examples

---

## 📝 Change Log

| Date       | Change                                        | Service                 |
| ---------- | --------------------------------------------- | ----------------------- |
| 2026-05-20 | Synchronized docs with actual implementations | All                     |
| 2026-05-14 | Guest cart fix implementation                 | order-service, frontend |

---
