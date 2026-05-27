# Order Service (Spring Boot)

## Tổng quan

**order-service** điều phối luồng giỏ hàng, tạo đơn, thanh toán và thông báo theo kiến trúc **Hybrid Orchestrator + Event-Driven**. Đây là service phức tạp nhất trong hệ thống vì vừa xử lý đồng bộ qua HTTP client, vừa phát sự kiện qua **RabbitMQ** cho các bước bất đồng bộ và rollback/compensating transactions.

## Vai trò trong hệ thống

| Vai trò              | Trách nhiệm                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Guest                | Xem danh sách sản phẩm/dịch vụ (lấy từ CSDL)                                               |
| Guest                | Xem chi tiết sản phẩm/dịch vụ                                                              |
| Guest                | Thêm sản phẩm/dịch vụ vào giỏ hàng                                                         |
| Guest                | Xem giỏ hàng (Session chỉ định danh guest cart, dữ liệu lưu trong Redis)                   |
| Guest                | Cập nhật số lượng (0 → xóa khỏi giỏ)                                                       |
| Customer             | Thực hiện toàn bộ chức năng của Guest                                                      |
| Customer             | Đăng nhập/đăng xuất qua auth-service                                                       |
| Customer             | Bắt buộc đăng nhập/đăng ký trước khi đặt hàng                                              |
| Customer             | Thanh toán đơn hàng (mock), lưu đơn vào CSDL và nhận email/thông báo đặt hàng thành công   |
| Customer             | Sau khi đặt hàng thành công, cart trong Redis sẽ được xóa                                  |
| Customer             | Xem trạng thái đơn, huỷ đơn nếu chưa xử lý                                                 |
| Admin                | Xem danh sách đơn hàng (sắp xếp theo ngày), xem chi tiết đơn hàng, cập nhật trạng thái đơn |
| order-service nội bộ | Gọi product-service, payment-service và email service                                      |

## Công nghệ

- Spring Boot 3.x
- Java 21
- **Spring AMQP + RabbitMQ** (Event-Driven Message Broker)
- Spring Web, Spring Data JPA, Spring Data Redis, Spring Mail, Spring Retry, Spring WebSocket
- MySQL + Redis + RabbitMQ

## Kiến trúc luồng xử lý

```
POST /api/cart/items or POST /api/orders (via Gateway)
    ↓
OrderController.resolveCartKey(HttpSession)
  ↓
guest:<sessionId> or <userId>
  ↓
CartService.save/merge/update/remove/clear(...) → Redis (TTL 24h)
  ↓
OrderService.createOrder(...)
  ├─→ save PENDING order in MySQL
  ├─→ paymentServiceClient.createPayment(...) → payment-service
  ├─→ productServiceClient.reserveInventory(...) → product-service
  ├─→ eventPublisherService.publishOrderCreated(...) → RabbitMQ
  ├─→ orderWebSocketNotifier.notifyNewOrder(...) → WebSocket
  ├─→ cartService.clearCart(...) → Redis delete
  └─→ orderEmailService.sendOrderPlacedEmail(...) → SMTP

[If cancel/failure] → OrderService.cancelOrder(...)
  ├─→ update order status in MySQL
  ├─→ productServiceClient.refundInventory(...)
  └─→ eventPublisherService.publishOrderCancelled(...)
```

**Return**: `202 Accepted` cho tạo đơn; các API cart trả `200/201/204`.

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

| Endpoint                                                   | Method | Response | Mô tả                                           |
| ---------------------------------------------------------- | ------ | -------- | ----------------------------------------------- |
| `/api/cart`                                                | GET    | 200      | Xem giỏ hàng hiện tại                           |
| `/api/cart/items`                                          | POST   | 201      | Thêm vào giỏ hàng                               |
| `/api/cart/items/{productId}`                              | PATCH  | 204      | Cập nhật số lượng / xóa khi quantity = 0        |
| `/api/cart/items/{productId}`                              | DELETE | 204      | Xóa sản phẩm khỏi giỏ                           |
| `/api/cart/session/login`                                  | POST   | 200      | Đồng bộ guest cart sang user cart khi đăng nhập |
| `/api/cart/session/logout`                                 | POST   | 204      | Hủy liên kết user khỏi session hiện tại         |
| `/api/orders`                                              | POST   | **202**  | Tạo đơn (hybrid sync + async orchestration)     |
| `/api/orders/{userId}`                                     | POST   | **202**  | Tạo đơn cho user cụ thể                         |
| `/api/orders`                                              | GET    | 200      | Danh sách tất cả đơn hàng                       |
| `/api/orders/user/{userId}`                                | GET    | 200      | Danh sách đơn của một user                      |
| `/api/orders/{orderId}`                                    | GET    | 200      | Chi tiết đơn                                    |
| `/api/orders/{orderId}/comments`                           | GET    | 200      | Danh sách comment của đơn                       |
| `/api/orders/products/{productId}/details`                 | GET    | 200      | Chi tiết sản phẩm theo ngữ cảnh đơn             |
| `/api/orders/users/{userId}/products/{productId}/comments` | POST   | 201      | Thêm comment sản phẩm                           |
| `/api/orders/{orderId}/status`                             | PATCH  | 200      | Cập nhật status (Admin)                         |
| `/api/orders/{orderId}/cancel`                             | DELETE | 202      | Hủy đơn (sync update + refund + event publish)  |

**Lưu ý**: `POST /api/orders` và `DELETE /api/orders/{orderId}/cancel` trả về `202 Accepted` vì nghiệp vụ chưa hoàn tất toàn bộ tại thời điểm trả response.

## Ví dụ request

`POST /api/orders`

```json
{
  "shippingAddress": "123 Nguyễn Trãi, Quận 1, TP.HCM"
}
```

`POST /api/cart/items`

```json
{
  "productId": 456,
  "productName": "Áo thun DTPShop",
  "quantity": 2,
  "price": 299000
}
```

## Ghi chú

### Luồng xử lý chính

- `HttpSession` chỉ dùng để định danh guest cart qua `guest:<sessionId>`
- `CartRepository` lưu dữ liệu cart trong Redis với TTL 24 giờ
- Khi login hoặc checkout, guest cart được merge sang user cart nếu cần
- `OrderService.createOrder(...)` lưu đơn `PENDING` vào MySQL, gọi payment/product client, publish event, notify websocket, clear cart và gửi email
- `OrderController` hỗ trợ cả `/api/orders` và `/api/orders/{userId}` để tạo đơn

### Saga / Event Flow

- `EventPublisherService` publish `OrderCreated`, `OrderCancelled`, `PaymentProcessed`, `PaymentFailed`, `InventoryReserved`
- `cancelOrder(...)` cập nhật trạng thái order, refund inventory và publish `OrderCancelled`
- `InventoryHandler` và `OrderSagaOrchestrator` phối hợp với `product-service` để reserve/refund tồn kho
- Các bước sync hiện tại nằm trong service layer, còn RabbitMQ dùng để mở rộng xử lý bất đồng bộ

### Redis & Cart

- Guest cart dùng key `guest:<sessionId>` khi chưa login
- User cart dùng key `<userId>` sau khi xác thực
- Sau khi đặt hàng thành công, `CartService.clearCart(...)` sẽ xóa key Redis tương ứng

### Testing

- Mock RabbitMQ trong unit tests hoặc dùng `testcontainers` để test integration
- Verify `createOrder()` lưu order, gọi payment/product client, publish event, notify websocket và clear cart
