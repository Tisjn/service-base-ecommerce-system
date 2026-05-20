# 📡 Complete API Documentation

**Last Updated:** May 20, 2026  
**Synchronized with:** All 8 Services  
**Base URL:** `http://localhost:3000` (API Gateway)

---

## Table of Contents

1. [Auth Service](#auth-service-api)
2. [User Service](#user-service-api)
3. [Product Service](#product-service-api)
4. [Cart & Order Service](#cart--order-service-api)
5. [Payment Service](#payment-service-api)
6. [Chat Service](#chat-service-api)
7. [AI Service](#ai-service-api)
8. [Common Response Formats](#common-response-formats)

---

## Auth Service API

**Service Port:** 3001  
**Gateway Routes:** `/auth`, `/api/auth`  
**Default Headers:** `Content-Type: application/json`

### 1. User Registration - Send OTP

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (200 OK)**

```json
{
  "success": true,
  "message": "OTP sent to email",
  "email": "user@example.com"
}
```

**Response (400 Bad Request)**

```json
{
  "error": "Email already registered"
}
```

---

### 2. Register - Verify OTP & Create Account

```http
POST /auth/register/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "password": "SecurePassword@123"
}
```

**Response (201 Created)**

```json
{
  "success": true,
  "message": "Account created successfully",
  "userId": "usr_12345"
}
```

---

### 3. Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword@123"
}
```

**Response (200 OK)**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "userId": "usr_12345",
  "email": "user@example.com"
}
```

---

### 4. Refresh Access Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK)**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

---

### 5. Logout (Revoke Refresh Token)

```http
POST /auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK)**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 6. Forgot Password - Send Reset OTP

```http
POST /auth/password/forgot
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200 OK)**

```json
{
  "success": true,
  "message": "Reset OTP sent to email"
}
```

---

### 7. Reset Password - Verify OTP & Change Password

```http
POST /auth/password/reset
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "654321",
  "newPassword": "NewSecurePassword@456"
}
```

**Response (200 OK)**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### 8. Upload Avatar (Optional)

```http
POST /auth/upload-avatar
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Form-Data:
  file: <image_file>
```

**Response (200 OK)**

```json
{
  "success": true,
  "avatarUrl": "https://s3.amazonaws.com/bucket/avatar_12345.jpg"
}
```

---

### 9. Health Check

```http
GET /auth/health
```

**Response (200 OK)**

```json
{
  "status": "UP",
  "service": "auth-service"
}
```

---

## User Service API

**Service Port:** 3002  
**Gateway Routes:** `/users`, `/api/users`  
**Authentication:** Required (JWT in Bearer token)

### 1. Get Own Profile

```http
GET /users/me
Authorization: Bearer <accessToken>
```

**Response (200 OK)**

```json
{
  "id": "usr_12345",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+84912345678",
  "address": "123 Main St, Ho Chi Minh City",
  "status": "active",
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-05-20T14:22:00Z"
}
```

---

### 2. Update Own Profile

```http
PATCH /users/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "firstName": "Jonathan",
  "phone": "+84987654321",
  "address": "456 Oak Ave, Da Nang"
}
```

**Response (200 OK)**

```json
{
  "id": "usr_12345",
  "email": "user@example.com",
  "firstName": "Jonathan",
  "lastName": "Doe",
  "phone": "+84987654321",
  "address": "456 Oak Ave, Da Nang",
  "status": "active",
  "updatedAt": "2026-05-20T14:30:00Z"
}
```

---

### 3. List All Users (Admin Only)

```http
GET /users
Authorization: Bearer <adminAccessToken>
```

**Response (200 OK)**

```json
[
  {
    "id": "usr_12345",
    "email": "user1@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "active",
    "createdAt": "2026-01-15T10:30:00Z"
  },
  {
    "id": "usr_12346",
    "email": "user2@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "status": "locked",
    "createdAt": "2026-02-10T08:15:00Z"
  }
]
```

---

### 4. Get User Details (Admin Only)

```http
GET /users/{userId}
Authorization: Bearer <adminAccessToken>
```

**Response (200 OK)**

```json
{
  "id": "usr_12345",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+84912345678",
  "address": "123 Main St, Ho Chi Minh City",
  "status": "active",
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-05-20T14:22:00Z"
}
```

---

### 5. Lock/Unlock User Account (Admin Only)

```http
PATCH /users/{userId}/status
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "status": "locked"
}
```

**Response (200 OK)**

```json
{
  "id": "usr_12345",
  "status": "locked",
  "updatedAt": "2026-05-20T14:35:00Z"
}
```

---

### 6. Delete User (Admin Only)

```http
DELETE /users/{userId}
Authorization: Bearer <adminAccessToken>
```

**Response (204 No Content)**

---

## Product Service API

**Service Port:** 3003  
**Gateway Routes:** `/api/products`, `/products`  
**Authentication:** Optional (required for create/update/delete)

### 1. Get Products List

```http
GET /api/products?page=0&size=20&categoryId=5&status=active&sortBy=price&direction=desc
```

**Query Parameters:**

- `page` - Page number (default: 0)
- `size` - Items per page (default: 20)
- `categoryId` - Filter by category ID
- `status` - Filter by status (active/inactive)
- `search` - Search by name/description
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `sortBy` - Sort field (name/price/stock/createdAt)
- `direction` - Sort direction (asc/desc)

**Response (200 OK)**

```json
{
  "content": [
    {
      "id": 1,
      "name": "Laptop Dell XPS 13",
      "description": "Premium ultrabook",
      "categoryId": 5,
      "price": 1200.0,
      "stock": 25,
      "status": "active",
      "images": ["https://s3.amazonaws.com/products/laptop1.jpg"],
      "createdAt": "2026-01-10T09:00:00Z"
    }
  ],
  "totalElements": 156,
  "totalPages": 8,
  "currentPage": 0,
  "hasNext": true
}
```

---

### 2. Get Product Details

```http
GET /api/products/{productId}
```

**Response (200 OK)**

```json
{
  "id": 1,
  "name": "Laptop Dell XPS 13",
  "description": "Premium ultrabook with Intel i7, 16GB RAM",
  "categoryId": 5,
  "category": {
    "id": 5,
    "name": "Electronics",
    "slug": "electronics"
  },
  "price": 1200.0,
  "stock": 25,
  "status": "active",
  "images": [
    "https://s3.amazonaws.com/products/laptop1.jpg",
    "https://s3.amazonaws.com/products/laptop2.jpg"
  ],
  "specifications": {
    "processor": "Intel i7",
    "ram": "16GB",
    "storage": "512GB SSD"
  },
  "createdAt": "2026-01-10T09:00:00Z",
  "updatedAt": "2026-05-20T11:20:00Z"
}
```

---

### 3. Create Product (Admin Only)

```http
POST /api/products
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "name": "New Wireless Mouse",
  "description": "Ergonomic wireless mouse",
  "categoryId": 6,
  "price": 25.99,
  "stock": 100,
  "images": ["https://s3.amazonaws.com/products/mouse1.jpg"],
  "status": "active"
}
```

**Response (201 Created)**

```json
{
  "id": 156,
  "name": "New Wireless Mouse",
  "description": "Ergonomic wireless mouse",
  "categoryId": 6,
  "price": 25.99,
  "stock": 100,
  "status": "active",
  "createdAt": "2026-05-20T15:00:00Z"
}
```

---

### 4. Update Product (Admin Only)

```http
PATCH /api/products/{productId}
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "name": "Updated Product Name",
  "price": 29.99,
  "stock": 95
}
```

**Response (200 OK)**

```json
{
  "id": 156,
  "name": "Updated Product Name",
  "price": 29.99,
  "stock": 95,
  "updatedAt": "2026-05-20T15:05:00Z"
}
```

---

### 5. Delete Product (Admin Only)

```http
DELETE /api/products/{productId}
Authorization: Bearer <adminAccessToken>
```

**Conditions:**

- Product must not be in any cart
- Product must not have reserved inventory

**Response (204 No Content)**

---

### 6. Update Product Stock (Admin Only)

```http
PATCH /api/products/{productId}/stock
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "quantity": 50,
  "operation": "set"
}
```

**Operations:** `set`, `add`, `subtract`

**Response (200 OK)**

```json
{
  "id": 1,
  "stock": 50,
  "updatedAt": "2026-05-20T15:10:00Z"
}
```

---

### 7. Get Categories

```http
GET /api/categories
```

**Response (200 OK)**

```json
[
  {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics",
    "description": "Computer and gadgets",
    "createdAt": "2025-12-01T08:00:00Z"
  },
  {
    "id": 2,
    "name": "Fashion",
    "slug": "fashion",
    "description": "Clothing and accessories",
    "createdAt": "2025-12-01T08:00:00Z"
  }
]
```

---

### 8. Create Category (Admin Only)

```http
POST /api/categories
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "name": "Home & Garden",
  "slug": "home-garden",
  "description": "Furniture and garden items"
}
```

**Response (201 Created)**

---

## Cart & Order Service API

**Service Port:** 3004  
**Gateway Routes:** `/cart`, `/api/cart`, `/orders`, `/api/orders`  
**Authentication:** Optional for cart, required for orders

### 1. Add Item to Cart

```http
POST /api/cart/{userId}/items
Content-Type: application/json
[Optional] Authorization: Bearer <accessToken>
[Optional] Cookie: JSESSIONID=<sessionId>

{
  "productId": 1,
  "quantity": 2
}
```

**User ID Resolution:**

- Authenticated: Uses user ID from JWT
- Guest: Uses `guest:<sessionId>` format

**Response (201 Created)**

```json
{
  "userId": "guest:abc123",
  "items": [
    {
      "productId": 1,
      "productName": "Laptop Dell XPS 13",
      "quantity": 2,
      "price": 1200.0,
      "subtotal": 2400.0
    }
  ],
  "total": 2400.0,
  "createdAt": "2026-05-20T15:20:00Z"
}
```

---

### 2. Get Cart

```http
GET /api/cart/{userId}
[Optional] Authorization: Bearer <accessToken>
```

**Response (200 OK)**

```json
{
  "userId": "guest:abc123",
  "items": [
    {
      "productId": 1,
      "productName": "Laptop Dell XPS 13",
      "quantity": 2,
      "price": 1200.0,
      "subtotal": 2400.0
    }
  ],
  "total": 2400.0,
  "itemCount": 1
}
```

---

### 3. Update Cart Item Quantity

```http
PATCH /api/cart/{userId}/items/{productId}
Content-Type: application/json

{
  "quantity": 1
}
```

**Response (200 OK)**

```json
{
  "userId": "guest:abc123",
  "items": [
    {
      "productId": 1,
      "productName": "Laptop Dell XPS 13",
      "quantity": 1,
      "price": 1200.0,
      "subtotal": 1200.0
    }
  ],
  "total": 1200.0
}
```

---

### 4. Remove Item from Cart

```http
DELETE /api/cart/{userId}/items/{productId}
```

**Response (204 No Content)**

---

### 5. Clear Entire Cart

```http
DELETE /api/cart/{userId}
```

**Response (204 No Content)**

---

### 6. Merge Guest Cart to User Cart

```http
POST /api/cart/{userId}/merge
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "guestToken": "guest:abc123"
}
```

**Response (200 OK)**

```json
{
  "success": true,
  "message": "Cart merged successfully",
  "items": [...],
  "total": 2400.00
}
```

---

### 7. Create Order (Customer Only)

```http
POST /api/orders
Authorization: Bearer <customerAccessToken>
Content-Type: application/json

{
  "shippingAddress": "123 Main St, Ho Chi Minh City",
  "paymentMethod": "MOMO"
}
```

**Response (202 Accepted)**

```json
{
  "orderId": "ord_12345",
  "status": "PENDING",
  "total": 2400.00,
  "items": [...],
  "createdAt": "2026-05-20T15:30:00Z",
  "message": "Order created. Please proceed with payment."
}
```

---

### 8. Get Customer's Orders

```http
GET /api/orders
Authorization: Bearer <customerAccessToken>
```

**Response (200 OK)**

```json
[
  {
    "id": "ord_12345",
    "status": "PROCESSING",
    "total": 2400.0,
    "itemCount": 1,
    "createdAt": "2026-05-20T15:30:00Z"
  }
]
```

---

### 9. Get Order Details

```http
GET /api/orders/{orderId}
Authorization: Bearer <accessToken>
```

**Response (200 OK)**

```json
{
  "id": "ord_12345",
  "userId": "usr_12345",
  "status": "PROCESSING",
  "items": [
    {
      "productId": 1,
      "productName": "Laptop Dell XPS 13",
      "quantity": 2,
      "price": 1200.0,
      "subtotal": 2400.0
    }
  ],
  "total": 2400.0,
  "shippingAddress": "123 Main St, Ho Chi Minh City",
  "paymentMethod": "MOMO",
  "createdAt": "2026-05-20T15:30:00Z",
  "updatedAt": "2026-05-20T15:35:00Z"
}
```

---

### 10. Cancel Order

```http
PATCH /api/orders/{orderId}/cancel
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

**Response (200 OK)**

```json
{
  "id": "ord_12345",
  "status": "CANCELLED",
  "cancelReason": "Changed my mind",
  "updatedAt": "2026-05-20T15:40:00Z"
}
```

---

### 11. List All Orders (Admin Only)

```http
GET /api/admin/orders
Authorization: Bearer <adminAccessToken>
```

**Response (200 OK)**

```json
[
  {
    "id": "ord_12345",
    "userId": "usr_12345",
    "status": "PROCESSING",
    "total": 2400.0,
    "createdAt": "2026-05-20T15:30:00Z"
  }
]
```

---

### 12. Update Order Status (Admin Only)

```http
PATCH /api/admin/orders/{orderId}/status
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "status": "SHIPPED"
}
```

**Valid Statuses:** `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`

**Response (200 OK)**

---

### 13. WebSocket: Real-time Order Updates

```javascript
const socket = io("http://localhost:3000", {
  auth: {
    token: accessToken,
  },
});

socket.on("order:created", (order) => {
  console.log("New order:", order);
});

socket.on("order:updated", (order) => {
  console.log("Order updated:", order);
});

socket.on("order:cancelled", (order) => {
  console.log("Order cancelled:", order);
});
```

---

## Payment Service API

**Service Port:** 3005  
**Gateway Routes:** `/payments`, `/api/payments`  
**Authentication:** Required

### 1. Create Payment

```http
POST /payments
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "orderId": 12345,
  "paymentMethod": "MOMO",
  "amount": 2400.00,
  "orderInfo": "Payment for order #12345"
}
```

**Payment Methods:** `MOMO`, `COD`

**Response (201 Created)**

```json
{
  "id": "pay_12345",
  "orderId": 12345,
  "paymentMethod": "MOMO",
  "amount": 2400.0,
  "status": "PENDING",
  "paymentUrl": "https://test-payment.momo.vn/...",
  "createdAt": "2026-05-20T15:45:00Z"
}
```

**For COD (no paymentUrl):**

```json
{
  "id": "pay_12346",
  "orderId": 12346,
  "paymentMethod": "COD",
  "amount": 1500.0,
  "status": "PENDING",
  "paymentUrl": null,
  "createdAt": "2026-05-20T15:50:00Z"
}
```

---

### 2. Get Payments

```http
GET /payments
Authorization: Bearer <accessToken>
```

**Response (200 OK)**

```json
[
  {
    "id": "pay_12345",
    "orderId": 12345,
    "paymentMethod": "MOMO",
    "amount": 2400.0,
    "status": "PAID",
    "paidAt": "2026-05-20T16:00:00Z"
  }
]
```

---

### 3. Get Payment Details

```http
GET /payments/{paymentId}
Authorization: Bearer <accessToken>
```

**Response (200 OK)**

```json
{
  "id": "pay_12345",
  "orderId": 12345,
  "paymentMethod": "MOMO",
  "provider": "MoMo Sandbox",
  "amount": 2400.0,
  "status": "PAID",
  "transactionCode": "TXN_12345",
  "gatewayTransactionId": "MOMO_12345",
  "paidAt": "2026-05-20T16:00:00Z",
  "createdAt": "2026-05-20T15:45:00Z"
}
```

---

### 4. Mark COD Payment as Paid (Admin Only)

```http
PATCH /payments/{paymentId}/cod-paid
Authorization: Bearer <adminAccessToken>
```

**Response (200 OK)**

```json
{
  "id": "pay_12346",
  "status": "PAID",
  "paidAt": "2026-05-20T16:30:00Z"
}
```

---

### 5. MoMo Webhook Handler (Internal)

```http
POST /payments/webhook/momo
Content-Type: application/json

{
  "orderId": 12345,
  "requestId": "req_12345",
  "amount": 2400000,
  "transId": "momo_txn_12345",
  "resultCode": 0,
  "message": "Successful",
  "signature": "hash_signature"
}
```

**Response (200 OK)**

```json
{
  "success": true,
  "message": "Payment verified and recorded"
}
```

---

## Chat Service API

**Service Port:** 3007  
**Gateway Routes:** `/chat`, `/api/chat`, `/uploads`  
**Authentication:** Required

### 1. List Conversations

```http
GET /chat/conversations
Authorization: Bearer <accessToken>
```

**Response (200 OK)**

```json
[
  {
    "id": "conv_12345",
    "participants": ["usr_12345", "usr_67890"],
    "lastMessage": "Thanks for your help!",
    "lastMessageAt": "2026-05-20T14:00:00Z",
    "unreadCount": 2
  }
]
```

---

### 2. Create Conversation

```http
POST /chat/conversations
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "participantIds": ["usr_67890"]
}
```

**Response (201 Created)**

```json
{
  "id": "conv_12345",
  "participants": ["usr_12345", "usr_67890"],
  "createdAt": "2026-05-20T15:00:00Z"
}
```

---

### 3. Get Message History

```http
GET /chat/conversations/{conversationId}/messages?limit=50&offset=0
Authorization: Bearer <accessToken>
```

**Response (200 OK)**

```json
{
  "messages": [
    {
      "id": "msg_12345",
      "senderId": "usr_12345",
      "text": "Hello!",
      "timestamp": "2026-05-20T14:00:00Z"
    },
    {
      "id": "msg_12346",
      "senderId": "usr_67890",
      "text": "Hi there!",
      "timestamp": "2026-05-20T14:01:00Z"
    }
  ],
  "hasMore": true
}
```

---

### 4. Send Message

```http
POST /chat/messages
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "conversationId": "conv_12345",
  "text": "I have a question about my order"
}
```

**Response (201 Created)**

```json
{
  "id": "msg_12347",
  "senderId": "usr_12345",
  "conversationId": "conv_12345",
  "text": "I have a question about my order",
  "timestamp": "2026-05-20T15:10:00Z"
}
```

---

### 5. Upload File

```http
POST /uploads
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Form-Data:
  file: <file>
  conversationId: conv_12345
```

**Response (200 OK)**

```json
{
  "fileUrl": "https://s3.amazonaws.com/chat-uploads/file_12345.jpg",
  "fileName": "screenshot.jpg",
  "fileSize": 245632,
  "uploadedAt": "2026-05-20T15:15:00Z"
}
```

---

### 6. WebSocket: Real-time Messaging

```javascript
const socket = io("http://localhost:3000/chat", {
  auth: {
    token: accessToken,
  },
});

// Join conversation
socket.emit("join:conversation", { conversationId: "conv_12345" });

// Listen for new messages
socket.on("message:new", (message) => {
  console.log("New message:", message);
});

// Listen for typing indicator
socket.on("user:typing", (data) => {
  console.log(`${data.userId} is typing...`);
});

// Send message via socket
socket.emit("message:send", {
  conversationId: "conv_12345",
  text: "Hello!",
});

// User online status
socket.on("user:online", (data) => {
  console.log(`${data.userId} is online`);
});

socket.on("user:offline", (data) => {
  console.log(`${data.userId} is offline`);
});
```

---

## AI Service API

**Service Port:** 3009  
**Gateway Routes:** `/ai`, `/api/ai`  
**Authentication:** Required (reads user-filtered data)

### 1. Ask Assistant

```http
POST /ai/ask
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "question": "Đơn hàng gần nhất của tôi đang ở trạng thái nào?"
}
```

**Response (200 OK)**

```json
{
  "answer": "Đơn hàng của bạn (Ord #12345) hiện đang ở trạng thái 'PROCESSING' (Đang xử lý). Được tạo vào ngày 20/05/2026 lúc 15:30, tổng giá trị 2.400.000 VND. Sẽ được vận chuyển sớm.",
  "readableTables": [
    "products",
    "categories",
    "orders:self_only",
    "order_items:self_only",
    "faq_policy"
  ],
  "responseTime": 2340
}
```

---

### 2. Get Filtered Context (Debug)

```http
GET /ai/summary
Authorization: Bearer <accessToken>
```

**Response (200 OK)**

```json
{
  "userId": "usr_12345",
  "context": {
    "products_count": 245,
    "categories_count": 12,
    "user_orders": [
      {
        "id": "ord_12345",
        "status": "PROCESSING",
        "total": 2400.00,
        "items": [...]
      }
    ],
    "faq_entries": 45
  },
  "timestamp": "2026-05-20T15:20:00Z"
}
```

---

### 3. Health Check

```http
GET /ai/health
```

**Response (200 OK)**

```json
{
  "status": "UP",
  "service": "ai-service",
  "database": "connected",
  "gemini": "ready"
}
```

---

## Common Response Formats

### Success Response (2xx)

```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "error": "Invalid request",
  "message": "Email is required",
  "statusCode": 400
}
```

### Validation Error

```json
{
  "success": false,
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ],
  "statusCode": 422
}
```

### Unauthorized (401)

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Token is invalid or expired",
  "statusCode": 401
}
```

### Forbidden (403)

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "You don't have permission to access this resource",
  "statusCode": 403
}
```

### Not Found (404)

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Product with ID 999 does not exist",
  "statusCode": 404
}
```

### Server Error (500)

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "statusCode": 500,
  "requestId": "req_12345"
}
```

---

## Authentication Header

All endpoints requiring authentication use:

```http
Authorization: Bearer <accessToken>
```

**Example:**

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfMTIzNDUiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiY3VzdG9tZXIiLCJpYXQiOjE2ODk5MDAwMDAsImV4cCI6MTY4OTkwMzYwMH0.signature
```

---

## Rate Limiting

The API Gateway applies rate limiting:

```
Server-wide: 100 requests/minute per IP
Endpoint-specific:
  - Registration: 5 attempts/minute
  - Login: 5 attempts/minute
  - Password reset: 5 attempts/minute
```

**Rate Limit Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1689903600
```

**When limit exceeded (429):**

```json
{
  "error": "Too Many Requests",
  "message": "Please try again after 1 minute",
  "statusCode": 429,
  "retryAfter": 60
}
```

---
