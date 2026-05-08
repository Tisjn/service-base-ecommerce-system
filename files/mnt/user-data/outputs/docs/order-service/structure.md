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
│   └── env.js
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
│   ├── orchestrator.service.js # Điều phối toàn bộ flow tạo đơn
│   ├── order.service.js        # CRUD đơn hàng, cập nhật status
│   ├── cart.service.js         # Quản lý giỏ hàng (Redis)
│   ├── inventory.service.js    # Gọi product-service check stock
│   ├── payment.service.js      # Gọi payment-service
│   └── notification.service.js # Gọi email service bên ngoài
│
├── repositories/               # [Persistence Layer]
│   ├── order.repository.js     # MySQL: orders, order_items
│   └── cart.repository.js      # Redis: cart:{userId}
│
├── middlewares/
│   ├── authHeader.js
│   ├── rateLimiter.js          # 5 req/phút cho POST /orders
│   └── errorHandler.js
│
└── utils/
    ├── httpClient.js           # axios với retry config
    └── logger.js
```

## API Endpoints

| Method | Path                     | Auth           | Mô tả                 |
| ------ | ------------------------ | -------------- | --------------------- |
| GET    | `/cart`                  | Customer       | Xem giỏ hàng          |
| POST   | `/cart/items`            | Customer       | Thêm sản phẩm vào giỏ |
| PATCH  | `/cart/items/:productId` | Customer       | Cập nhật số lượng     |
| DELETE | `/cart/items/:productId` | Customer       | Xóa khỏi giỏ          |
| POST   | `/orders`                | Customer       | Tạo đơn hàng          |
| GET    | `/orders`                | Customer       | Lịch sử đơn hàng      |
| GET    | `/orders/:id`            | Customer/Admin | Chi tiết đơn hàng     |
| PATCH  | `/orders/:id/status`     | Admin          | Cập nhật trạng thái   |
| DELETE | `/orders/:id/cancel`     | Customer       | Hủy đơn               |

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

## Luồng dữ liệu chính

### Tạo đơn hàng

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
    ├─► InventoryService.check(cartItems)
    │       └─► HTTP GET product-service/products/:id  [retry 3x nếu fail]
    │
    ├─► OrderService.save(order)
    │       └─► MySQL INSERT orders + order_items
    │
    ├─► PaymentService.process(order)
    │       └─► HTTP POST payment-service/payments     [retry 3x nếu fail]
    │           ├── SUCCESS → continue
    │           └── FAIL    → OrderService.cancel(orderId) → throw error
    │
    └─► NotificationService.sendEmail(userId, order)   [fire & forget]
            └─► HTTP POST Email Provider (external)

Response: { orderId, status: "CONFIRMED", totalAmount }
```

## Redis Key Patterns

```
cart:{userId}   → JSON array of cart items, TTL 24 giờ
```

## Ghi chú kiến trúc

> 💡 **Về Orchestrator vs Choreography**: Diagram dùng Orchestrator pattern (có một service trung tâm điều phối). Đây là lựa chọn phù hợp cho hệ thống nhỏ/vừa vì:
>
> - Dễ debug: logic tập trung một chỗ
> - Dễ implement rollback (compensating transactions)
> - Không cần Message Broker phức tạp như Kafka
>
> Nhược điểm: Orchestrator trở thành single point of coupling. Với production scale lớn hơn, nên chuyển sang Choreography + Event Bus.
