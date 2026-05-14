# Order Service (Spring Boot)

## Tổng quan

**order-service** điều phối luồng giỏ hàng, tạo đơn, thanh toán và thông báo theo kiến trúc **Event-Driven Mediator Topology**. Đây là service phức tạp nhất trong hệ thống vì phải xử lý nhiều bước liên tiếp qua **Message Queue (RabbitMQ)** với **Saga Pattern** cho rollback/compensating transactions.

## Vai trò trong hệ thống

| Vai trò              | Trách nhiệm                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Guest                | Xem danh sách sản phẩm/dịch vụ (lấy từ CSDL)                                               |
| Guest                | Xem chi tiết sản phẩm/dịch vụ                                                              |
| Guest                | Thêm sản phẩm/dịch vụ vào giỏ hàng                                                         |
| Guest                | Xem giỏ hàng (dữ liệu lưu trong Session)                                                   |
| Guest                | Cập nhật số lượng (0 → xóa khỏi giỏ)                                                       |
| Customer             | Thực hiện toàn bộ chức năng của Guest                                                      |
| Customer             | Đăng nhập/đăng xuất qua auth-service                                                       |
| Customer             | Bắt buộc đăng nhập/đăng ký trước khi đặt hàng                                              |
| Customer             | Thanh toán đơn hàng (mock), lưu đơn vào CSDL và nhận email/thông báo đặt hàng thành công   |
| Customer             | Sau khi đặt hàng thành công, Session giỏ hàng sẽ được xóa                                  |
| Customer             | Xem trạng thái đơn, huỷ đơn nếu chưa xử lý                                                 |
| Admin                | Xem danh sách đơn hàng (sắp xếp theo ngày), xem chi tiết đơn hàng, cập nhật trạng thái đơn |
| order-service nội bộ | Gọi product-service, payment-service và email service                                      |

## Công nghệ

- Spring Boot 3.x
- Java 21
- **Spring AMQP + RabbitMQ** (Event-Driven Message Broker)
- Spring Web, Spring Data JPA, Spring Data Redis, Spring Mail, Spring Retry
- MySQL + Redis

## Kiến trúc Event-Driven Mediator Topology

```
POST /orders (Customer)
    ↓
OrderService.create() → save PENDING order
    ↓
EventEmitter.publish("OrderCreated") → RabbitMQ
    ↓ [ASYNC via Message Queue]
    ├─→ inventory-reserve queue → InventoryHandler
    │   └─→ check/reserve stock → InventoryReserved/Failed
    │
    ├─→ payment-process queue → PaymentHandler
    │   └─→ process payment → PaymentProcessed/Failed
    │
    └─→ notification-send queue → NotificationHandler
        └─→ send email confirmation

[If PaymentFailed] → Saga Pattern
    └─→ CompensatingTransactionHandler
        ├─→ cancel order
        ├─→ refund inventory
        └─→ publish "OrderCancelled"
```

**Return**: 202 Accepted (Workflow continues async)

## Biến môi trường

```env
SERVER_PORT=3003

# AWS RDS MySQL
RDS_HOST=database-1-instance-1.cvwyy4mmuaiw.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_DB=ecommerce_data
RDS_USER=admin
RDS_PASSWORD=Tinle091104
RDS_SSL=false

SPRING_DATASOURCE_URL=jdbc:mysql://${RDS_HOST}:${RDS_PORT}/${RDS_DB}?useSSL=${RDS_SSL}&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=${RDS_USER}
SPRING_DATASOURCE_PASSWORD=${RDS_PASSWORD}

# Redis
SPRING_REDIS_HOST=redis-cache
SPRING_REDIS_PORT=6379
REDIS_HOST=redis-cache
REDIS_PORT=6379

# RabbitMQ (Message Broker) [NEW - Event-Driven]
SPRING_RABBITMQ_HOST=rabbitmq
SPRING_RABBITMQ_PORT=5672
SPRING_RABBITMQ_USERNAME=guest
SPRING_RABBITMQ_PASSWORD=guest
SPRING_RABBITMQ_VIRTUAL_HOST=/

PRODUCT_SERVICE_URL=http://product-service:3003
PAYMENT_SERVICE_URL=http://payment-service:3005
```

## Chạy ứng dụng

```bash
mvn spring-boot:run
```

Hoặc chạy Docker:

```bash
docker build -t order-service .
docker run --rm -p 3004:3004 order-service
```

## API chính

> Base path: `/api`

| Endpoint                               | Method | Response | Mô tả                                    |
| -------------------------------------- | ------ | -------- | ---------------------------------------- |
| `/api/cart/{userId}`                   | GET    | 200      | Xem giỏ hàng                             |
| `/api/cart/{userId}/items`             | POST   | 201      | Thêm vào giỏ hàng                        |
| `/api/cart/{userId}/items/{productId}` | PATCH  | 204      | Cập nhật số lượng / xóa khi quantity = 0 |
| `/api/cart/{userId}/items/{productId}` | DELETE | 204      | Xóa sản phẩm khỏi giỏ                    |
| `/api/orders?userId={userId}`          | POST   | **202**  | Tạo đơn (async via Message Queue)        |
| `/api/orders/{userId}`                 | POST   | **202**  | Tạo đơn cho user cụ thể                  |
| `/api/orders`                          | GET    | 200      | Danh sách tất cả đơn hàng                |
| `/api/orders/user/{userId}`            | GET    | 200      | Danh sách đơn của một user               |
| `/api/orders/{orderId}`                | GET    | 200      | Chi tiết đơn                             |
| `/api/orders/{orderId}/status`         | PATCH  | 200      | Cập nhật status (Admin)                  |
| `/api/orders/{orderId}/cancel`         | DELETE | 202      | Hủy đơn (async compensating transaction) |

**Lưu ý**: `POST /api/orders`, `POST /api/orders/{userId}` và `DELETE /api/orders/{orderId}/cancel` trả về **202 Accepted** vì xử lý async qua Message Queue.

## Ví dụ request

`POST /api/orders?userId=123`

```json
{
  "shippingAddress": "123 Nguyễn Trãi, Quận 1, TP.HCM"
}
```

`POST /api/orders/123`

```json
{
  "shippingAddress": "123 Nguyễn Trãi, Quận 1, TP.HCM"
}
```

`POST /api/cart/123/items`

```json
{
  "productId": 456,
  "productName": "Áo thun DTPShop",
  "quantity": 2,
  "price": 299000
}
```

## Ghi chú

### Event-Driven Mediator Topology

- **Message Broker (RabbitMQ)** đóng vai trò **Mediator** trung tâm điều phối workflow
- **OrchestratorService** publish `OrderCreated` event → Message Queue (không HTTP call)
- **Event Handlers** lắng nghe events trong các queue riêng (async):
  - `InventoryHandler` → check/reserve inventory
  - `PaymentHandler` → process payment
  - `NotificationHandler` → send email
  - `CompensatingTransactionHandler` → rollback if failure

### Saga Pattern - Handling Failures

- Nếu **InventoryFailed**: publish event → compensating handler cancel order
- Nếu **PaymentFailed**: publish event → compensating handler refund inventory + cancel order
- Automatic **retry** (3x) cho mỗi handler nếu exception

### API Response

- `POST /orders` trả về **202 Accepted** (không phải 200/201)
  - Client nhận order ID ngay lập tức
  - Status sẽ update async qua events
  - Client có thể poll `GET /orders/:id` để track status

### Redis & Cart

- Giỏ hàng lưu trong Redis với TTL 24 giờ (key: `cart:{userId}`)
- Sau khi đặt hàng thành công, `CartService` sẽ xóa cart

### Chạy local với RDS (dev)

Nếu bạn muốn chạy `order-service` kết nối tới RDS giống `product`/`auth`, export các biến môi trường hoặc dùng Docker Compose (docker-compose.yml already includes RDS values). Ví dụ khởi bằng Maven với RDS thông tin:

```bash
cd services/order-service
mvn -Dmaven.test.skip=true -Dspring-boot.run.jvmArguments="-Dspring.datasource.url=jdbc:mysql://<RDS_HOST>:<RDS_PORT>/<RDS_DB> -Dspring.datasource.username=<RDS_USER> -Dspring.datasource.password=<RDS_PASSWORD> -Dserver.port=3004 -Dspring.jpa.hibernate.ddl-auto=update" spring-boot:run
```

Ghi chú:

- `ddl-auto=update` chỉ dùng cho môi trường dev để tự tạo/điều chỉnh bảng. Không dùng trong production nếu không muốn thay schema.
- Nếu Redis chứa dữ liệu cũ với trường không khớp DTO (ví dụ `subtotal`), xóa cache trước khi gọi API:

```bash
# xóa toàn bộ DB Redis (thận trọng)
redis-cli -h <redis-host> -p <redis-port> FLUSHDB

# hoặc xóa cart user cụ thể
redis-cli -h <redis-host> -p <redis-port> DEL cart:1
```

Hoặc dùng Docker Compose để khởi toàn bộ stack (Redis, RabbitMQ, order-service):

```bash
docker compose up --build
```

### Testing

- Mock RabbitMQ trong unit tests hoặc dùng `testcontainers` để test integration
- Verify OrderCreated event được publish
- Verify Event Handlers xử lý đúng theo flow
