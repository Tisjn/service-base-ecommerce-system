# Order Service — Project Structure

## Cấu trúc thư mục

```
src/
├── index.js
├── app.js
│
├── config/
│   ├── db.js
│   ├── redis.js
│   ├── env.js
│   └── messagebroker.js        # [NEW] RabbitMQ/Message Broker config
│
├── routes/
│   ├── order.routes.js         # /orders, /orders/:id
│   └── cart.routes.js          # /cart, /cart/items
│
├── controllers/
│   ├── order.controller.js
│   └── cart.controller.js
│
├── services/                   # [Business Layer]
│   ├── orchestrator.service.js # [UPDATED] Điều phối flow via Message Queue
│   ├── order.service.js        # CRUD đơn hàng, cập nhật status
│   ├── cart.service.js         # Quản lý giỏ hàng (Redis)
│   └── event.emitter.js        # [NEW] Publish events vào Message Queue
│
├── repositories/               # [Persistence Layer]
│   ├── order.repository.js     # MySQL: orders, order_items
│   └── cart.repository.js      # Redis: cart:{userId}
│
├── events/                     # [NEW] Event Handlers (Mediator Topology)
│   ├── handlers/
│   │   ├── order.created.handler.js       # Lắng nghe OrderCreated event
│   │   ├── inventory.reserved.handler.js  # Lắng nghe InventoryReserved event
│   │   ├── payment.processed.handler.js   # Lắng nghe PaymentProcessed event
│   │   ├── payment.failed.handler.js      # [NEW] Compensating transaction
│   │   └── order.confirmed.handler.js     # Finalize order
│   │
│   └── types/
│       ├── order.created.event.js
│       ├── inventory.reserved.event.js
│       ├── payment.processed.event.js
│       ├── payment.failed.event.js
│       └── order.confirmed.event.js
│
├── middlewares/
│   ├── authHeader.js
│   ├── rateLimiter.js          # 5 req/phút cho POST /orders
│   └── errorHandler.js
│
└── utils/
    ├── messageQueue.js         # [NEW] Wrapper for RabbitMQ operations
    └── logger.js
```

## API Endpoints

| Method | Path                     | Auth           | Mô tả                                                                                                       |
| ------ | ------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------- |
| GET    | `/cart`                  | Guest/Customer | Xem giỏ hàng                                                                                                |
| POST   | `/cart/items`            | Guest/Customer | Thêm sản phẩm vào giỏ                                                                                       |
| PATCH  | `/cart/items/:productId` | Guest/Customer | Cập nhật số lượng                                                                                           |
| DELETE | `/cart/items/:productId` | Guest/Customer | Xóa khỏi giỏ                                                                                                |
| POST   | `/orders`                | Customer       | Tạo đơn hàng (bắt buộc đăng nhập/đăng ký), thanh toán mock, lưu CSDL, gửi thông báo và xóa Session giỏ hàng |
| GET    | `/orders`                | Customer/Admin | Lịch sử đơn hàng (admin xem tất cả đơn, sắp xếp theo ngày)                                                  |
| GET    | `/orders/:id`            | Customer/Admin | Chi tiết đơn hàng                                                                                           |
| PATCH  | `/orders/:id/status`     | Admin          | Cập nhật trạng thái                                                                                         |
| DELETE | `/orders/:id/cancel`     | Customer       | Hủy đơn                                                                                                     |

## Database Schema

```sql
-- MySQL: orderdb
CREATE TABLE orders (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    total_amount    DECIMAL(15, 2) NOT NULL,
    status          ENUM('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED') DEFAULT 'PENDING',
    shipping_address TEXT,
    payment_id      VARCHAR(100),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id     BIGINT NOT NULL REFERENCES orders(id),
    product_id   BIGINT NOT NULL,
    product_name VARCHAR(255),
    price        DECIMAL(15, 2),
    quantity     INT NOT NULL,
    subtotal     DECIMAL(15, 2)
);
```

## Luồng dữ liệu chính (Event-Driven Mediator Topology)

### 1️⃣ Tạo đơn hàng - Publish OrderCreated Event

```
POST /orders
    │
    ▼
rateLimiter (5/phút)
    │
    ▼
OrderController.create()
    │
    ▼
OrchestratorService.createOrder(userId, cartItems)
    │
    ├─► OrderService.save(order)
    │       └─► MySQL INSERT orders + order_items (status: PENDING)
    │
    ├─► EventEmitter.publish("OrderCreated")
    │   {
    │     orderId, userId, cartItems, totalAmount,
    │     timestamp, correlationId
    │   }
    │   └─► Message Queue (RabbitMQ)
    │
    └─► Response 202 Accepted { orderId, status: "PENDING" }
```

### 2️⃣ Message Queue lắng nghe OrderCreated Event

```
Message Broker (RabbitMQ)
    │
    ├─► exchange: "order.events"
    ├─► queue: "inventory.reserve"
    ├─► queue: "payment.process"
    └─► queue: "notification.send"
```

### 3️⃣ Service A: Inventory Reserve (async handler)

```
📨 InventoryHandler lắng nghe "OrderCreated"
    │
    ▼
Call product-service API: PATCH /products/{id}/stock
    │
    ├── SUCCESS → EventEmitter.publish("InventoryReserved")
    │             └─► Message Queue
    │
    └── FAIL    → EventEmitter.publish("InventoryFailed")
                  └─► Compensating Transaction: OrderService.cancel()
```

### 4️⃣ Service B: Payment Process (async handler)

```
📨 PaymentHandler lắng nghe "InventoryReserved"
    │
    ▼
Call payment-service API: POST /payments
    │
    ├── SUCCESS → EventEmitter.publish("PaymentProcessed")
    │             { orderId, paymentId, timestamp }
    │             └─► Message Queue
    │
    └── FAIL    → EventEmitter.publish("PaymentFailed")
                  └─► Saga Pattern:
                      - OrderService.cancel()
                      - Call product-service refund inventory
                      - Publish "OrderCancelled" event
```

### 5️⃣ Service C: Notification (async handler) + Order Confirmation

```
📨 NotificationHandler lắng nghe "PaymentProcessed"
    │
    ▼
Send email confirmation (fire & forget)
    │
    ▼
EventEmitter.publish("OrderConfirmed")
    │
    ▼
📨 OrderConfirmedHandler:
    ├─► CartService.clear(userId)
    │       └─► Redis DEL cart:{userId}
    ├─► OrderService.updateStatus(orderId, "CONFIRMED")
    │       └─► MySQL UPDATE status
    └─► EventEmitter.publish("OrderCompleted")
```

### 📊 Toàn bộ Saga Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Message Broker (RabbitMQ)                 │
└─────────────────────────────────────────────────────────────┘
                           ▲
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    [Publish Events]  [Queue Events]   [Subscribe Events]
         │                 │                 │
         ▼                 ▼                 ▼

    OrderCreated ────► order.events ────► InventoryHandler
         │                 │
         │                 ├────► InventoryReserved ──► PaymentHandler
         │                 │
         │                 ├────► PaymentProcessed ──► NotificationHandler
         │                 │
         └─────────────────┴────► PaymentFailed ──► CompensatingHandler
                                   (Saga Rollback)
```

## Redis Key Patterns

```
cart:{userId}   → JSON array of cart items, TTL 24 giờ
```

## Ghi chú kiến trúc

### 🎯 Event-Driven Mediator Topology

**Mediator Topology** là mô hình event-driven nơi:

- **Message Broker (RabbitMQ)** đóng vai trò **Mediator** trung tâm
- **Orchestrator Service** quản lý workflow và emit events
- **Event Handlers** (trong các services) lắng nghe và xử lý async

**So sánh các patterns:**

| Pattern              | Orchestrator     | Mediator Topology   | Choreography        |
| -------------------- | ---------------- | ------------------- | ------------------- |
| **Điều phối**        | Synchronous HTTP | Message Queue async | Peer-to-peer events |
| **Coupling**         | Tight            | Loose               | Very Loose          |
| **Complexity**       | Đơn giản         | Trung bình          | Phức tạp            |
| **Debugging**        | Dễ               | Trung bình          | Khó                 |
| **Failure Handling** | Tập trung        | Saga + Compensating | Distributed Saga    |

### 📋 Ưu điểm Mediator Topology cho Order Service

✅ **Decoupling**: Services không gọi trực tiếp, giao tiếp qua queue
✅ **Async Processing**: Inventory, Payment, Notification độc lập
✅ **Fault Tolerance**: Nếu Payment fail → Orchestrator rollback qua Saga Pattern
✅ **Scalability**: Dễ thêm event handlers mới mà không ảnh hưởng existing code
✅ **Visibility**: Mỗi event là một state trong workflow, dễ track order status

### 🔄 Saga Pattern - Handling Failures

**Compensating Transactions** cho rollback:

```
InventoryFailed?
  └─► Publish "InventoryFailed" event
      └─► OrderHandler: cancel order, restore status to CANCELLED

PaymentFailed?
  └─► Publish "PaymentFailed" event
      └─► OrderHandler: cancel order
      └─► InventoryHandler: refund reserved inventory
      └─► Publish "OrderCancelled" event
```

### 🏗️ Event Types cần implement

| Event                 | Producer                | Consumer                         | Tác dụng                         |
| --------------------- | ----------------------- | -------------------------------- | -------------------------------- |
| **OrderCreated**      | Orchestrator            | Inventory, Payment, Notification | Khởi động workflow               |
| **InventoryReserved** | Inventory Handler       | Payment Handler                  | Stock available, proceed payment |
| **InventoryFailed**   | Inventory Handler       | Compensating                     | Hủy order, không đủ stock        |
| **PaymentProcessed**  | Payment Handler         | Notification, Order Confirmed    | Thanh toán thành công            |
| **PaymentFailed**     | Payment Handler         | Compensating                     | Refund inventory, hủy order      |
| **OrderConfirmed**    | Order Confirmed Handler | Cart, Notification               | Clear cart, gửi email            |
| **OrderCompleted**    | Order Confirmed Handler | Analytics, Audit                 | Finalize workflow                |

### 💡 Key Differences từ Orchestrator cũ

| Aspect                | Trước (Orchestrator)        | Sau (Mediator Topology)        |
| --------------------- | --------------------------- | ------------------------------ |
| **Flow Control**      | Orchestrator gọi trực tiếp  | Message Queue điều phối        |
| **Response Time**     | 202 Accepted, process async | 202 Accepted, nhưng via queue  |
| **Failure Handling**  | Throw error ngay lập tức    | Saga Pattern + Compensating Tx |
| **Service Discovery** | Cần biết endpoint           | Chỉ biết event type            |
| **Testing**           | Mock HTTP calls             | Mock Message Queue             |
