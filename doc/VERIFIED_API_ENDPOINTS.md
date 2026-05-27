# Verified API Endpoints (generated)

This file lists verified HTTP endpoints discovered from service controllers in the codebase.

Notes:

- Gateway proxies and rewrites are configured in services/api-gateway/src/proxy/proxyRouter.js.
- Authenticated requests typically require JWT verified at the gateway; gateway injects `X-User-Id`, `X-User-Role`, `X-User-Email`.
- Guest cart flows use `X-Guest-Token` (optional) and are proxied to order/product services.

---

## Auth Service (Node.js)

- POST /auth/register
- POST /auth/register/verify
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- POST /auth/password/forgot
- POST /auth/password/reset
- POST /auth/upload-avatar
- POST /auth/verify (internal, used by API Gateway)
- GET /health

## Product Service (Spring Boot)

All routes under `/api` when proxied through the gateway.

- GET /api/products
- GET /api/products/{id}
- POST /api/product-images
- POST /api/products
- PATCH /api/products/{id}
- DELETE /api/products/{id}
- PATCH /api/products/{id}/restore
- DELETE /api/products/{id}/permanent
- PATCH /api/products/{id}/stock

Cart-related (product-service exposes helper/cart endpoints proxied to `/cart`):

- GET /api/cart/{userId}
- POST /api/cart/{userId}/items
- PATCH /api/cart/{userId}/items/{productId}
- DELETE /api/cart/{userId}/items/{productId}
- DELETE /api/cart/{userId}
- POST /api/cart/merge
- POST /api/cart/{userId}/checkout

Category management:

- GET /api/categories
- POST /api/categories
- PATCH /api/categories/{id}
- DELETE /api/categories/{id}

Inventory controller (proxied at `/api/inventory`):

- POST /api/inventory/reserve
- POST /api/inventory/refund

## Order Service (Spring Boot)

All routes proxied under `/api` or `/orders` as configured.

Cart/session endpoints:

- GET /api/cart
- POST /api/cart/items
- PATCH /api/cart/items/{productId}
- DELETE /api/cart/items/{productId}
- DELETE /api/cart
- POST /api/cart/session/login
- POST /api/cart/session/logout

Order endpoints:

- POST /api/orders
- POST /api/orders/{userId}
- GET /api/orders
- GET /api/orders/user/{userId}
- GET /api/orders/{orderId}
- GET /api/orders/{orderId}/comments
- GET /api/orders/products/{productId}/details
- GET /api/admin/products/{productId}/details-with-comments
- GET /api/admin/products/{productId}/orders-exist
- POST /api/orders/users/{userId}/products/{productId}/comments
- PATCH /api/orders/{orderId}/status
- DELETE /api/orders/{orderId}/cancel

WebSocket / realtime:

- /ws (proxied to order-service) — upgrade path for order-service websocket

## Payment Service (Spring Boot)

- POST /payments
- GET /payments
- GET /payments?orderId={orderId}
- GET /payments/{id}
- PATCH /payments/{id}/cod-paid
- POST /payments/webhook/momo
- GET /payments/return/momo

## User Service (Spring Boot)

- GET /users/me
- PATCH /users/me
- GET /users
- GET /users/{id}
- GET /users/{id}/addresses
- GET /users/me/addresses
- POST /users/me/addresses
- PATCH /users/me/addresses/{addressId}
- PATCH /users/{id}
- PATCH /users/{id}/status
- DELETE /users/{id}

## AI Service (Spring Boot)

All routes proxied under `/api/ai` or `/ai`.

- POST /api/ai/ask
- GET /api/ai/summary
- GET /api/ai/health

## Chat Service (Node.js)

Proxied under `/chat` or `/api/chat` (gateway maps `/chat` to service)

- GET /chat/rooms
- POST /chat/rooms
- GET /chat/rooms/{roomId}
- GET /chat/rooms/{roomId}/messages
- POST /chat/upload (file upload)
- GET /health

## API Gateway (Node.js)

- GET /health
- Proxy rules (high-level):
  - /auth, /api/auth -> auth-service
  - /users, /api/users -> user-service (verify JWT)
  - /cart, /api/cart -> order-service (optionalVerifyJWT)
  - /products, /categories, /product-images, /inventory -> product-service
  - /orders, /admin/products -> order-service
  - /payments, /api/payments -> payment-service
  - /ai, /api/ai -> ai-service
  - /chat, /api/chat -> chat-service (WS enabled)
  - /ws -> order-service (websocket upgrade)
  - /socket.io -> chat-service (websocket upgrade)

---

If you want, I can now:

- generate per-service README updates from this list, or
- merge these endpoints into doc/API_DOCUMENTATION.md and update samples.
