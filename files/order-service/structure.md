# Order Service — Project Structure

**Port:** 3004 | **Framework:** Spring Boot 3.x | **Language:** Java 21

## Cấu trúc thư mục

```
src/
├── main/java/com/example/orderservice/
│   │
│   ├── controller/
│   │   ├── OrderController.java
│   │   ├── CartController.java
│   │   └── AdminOrderController.java
│   │
│   ├── service/
│   │   ├── OrderService.java           # Orchestration
│   │   ├── CartService.java
│   │   ├── OrderEventPublisher.java    # RabbitMQ
│   │   └── OrderEmailService.java
│   │
│   ├── client/
│   │   ├── ProductServiceClient.java   # HTTP to product-service
│   │   ├── PaymentServiceClient.java   # HTTP to payment-service
│   │   └── OrderWebSocketNotifier.java # WebSocket
│   │
│   ├── repository/
│   │   ├── OrderRepository.java
│   │   ├── OrderItemRepository.java
│   │   └── CartRepository.java
│   │
│   ├── entity/
│   │   ├── Order.java
│   │   └── OrderItem.java
│   │
│   ├── dto/
│   │   ├── OrderDTO.java
│   │   ├── OrderItemDTO.java
│   │   └── CartDTO.java
│   │
│   ├── event/
│   │   ├── OrderCreatedEvent.java
│   │   ├── OrderCancelledEvent.java
│   │   └── EventPublisher.java
│   │
│   ├── config/
│   │   ├── RabbitMQConfig.java
│   │   ├── WebSocketConfig.java
│   │   └── SecurityConfig.java
│   │
│   └── OrderServiceApplication.java
│
└── resources/
    ├── application.yml
    └── schema.sql
```

## API Endpoints

| Method | Path                               | Auth     | Mô tả                   |
| ------ | ---------------------------------- | -------- | ----------------------- |
| POST   | `/cart/items`                      | Optional | Thêm vào giỏ            |
| GET    | `/cart/{userId}`                   | Optional | Xem giỏ                 |
| PATCH  | `/cart/{userId}/items/{productId}` | Optional | Cập nhật quantity       |
| DELETE | `/cart/{userId}/items/{productId}` | Optional | Xóa item                |
| POST   | `/cart/{userId}/merge`             | JWT      | Merge guest → user cart |
| POST   | `/orders`                          | JWT      | Tạo đơn (customer only) |
| GET    | `/orders`                          | JWT      | Xem đơn của mình        |
| GET    | `/orders/{id}`                     | JWT      | Chi tiết đơn            |
| PATCH  | `/orders/{id}/cancel`              | JWT      | Hủy đơn                 |
| GET    | `/admin/orders`                    | Admin    | Xem tất cả đơn          |
| PATCH  | `/admin/orders/{id}/status`        | Admin    | Cập nhật trạng thái     |

## Luồng dữ liệu — Create Order (Orchestration)

```
POST /orders (customer)
    │
    ▼
OrderController.createOrder(userId, request)
    │
    ▼
OrderService.createOrder()
    │
    ├─→ 1. Create PENDING order in MySQL
    │
    ├─→ 2. Call ProductService.reserveInventory()
    │       (HTTP POST /api/inventory/reserve)
    │   ├── Success? Continue
    │   └── Fail? Rollback order, 400 error
    │
    ├─→ 3. Call PaymentService.createPayment()
    │       (HTTP POST /payments)
    │   ├── Success? Get payment details
    │   └── Fail? Rollback order + inventory
    │
    ├─→ 4. Publish event to RabbitMQ
    │       (Event: order.created)
    │   └── Topic: order-events
    │       Subscribers: email-service, notification-service
    │
    ├─→ 5. Send WebSocket notification
    │       (To admin dashboard)
    │       { "event": "order.new", "orderId": "..." }
    │
    ├─→ 6. Clear cart in Redis
    │       (DEL cart:{userId})
    │
    └─→ 7. Send email via Spring Mail (SMTP)

    ▼
Response: 202 Accepted (Order created, payment pending)
```

## Luồng dữ liệu — Guest Cart (Session-based)

```
GET /cart/guest:session123
    │
    ▼
OrderController.resolveCartKey(HttpSession)
    ├── HttpSession.getId() = "abc123"
    └── cartKey = "guest:abc123"
    │
    ▼
CartService.getCart(cartKey)
    │
    ▼
CartRepository.getFromRedis(cartKey)
    ├── Hit? return cart JSON
    └── Miss? return empty cart
    │
    ▼
Response: {
  "userId": "guest:abc123",
  "items": [...],
  "total": 0
}
```

## Luồng dữ liệu — Merge Cart

```
POST /cart/{userId}/merge
    + Auth: JWT
    + Body: { guestToken: "guest:abc123" }
    │
    ▼
CartService.mergeGuestCart()
    │
    ├─→ Get guest cart from Redis
    │   ├── Key: cart:guest:abc123
    │   └── Value: { items: [...] }
    │
    ├─→ Get user cart from Redis (if exists)
    │
    ├─→ Merge items (handle duplicates)
    │
    ├─→ Save merged cart to Redis
    │   ├── Key: cart:usr_123
    │   └── TTL: 24 hours
    │
    ├─→ Delete guest cart
    │   └── DEL cart:guest:abc123
    │
    └─→ Update frontend: clear guestToken

    ▼
Response: {
  "success": true,
  "items": [...merged items...],
  "total": 5000.00
}
```

---
