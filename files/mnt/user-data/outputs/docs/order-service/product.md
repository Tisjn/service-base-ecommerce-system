# Order Service — Product Description

## Tổng quan

**order-service** điều phối toàn bộ quy trình đặt hàng theo kiến trúc **Event-Driven Mediator Topology** và là service phức tạp nhất trong hệ thống. Service này xử lý giỏ hàng, tạo đơn, thanh toán, thông báo thông qua **Message Queue (RabbitMQ)** chứ không phải HTTP synchronous calls.

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
| Customer             | Xem trạng thái đơn, hủy đơn nếu chưa xử lý                                                 |
| Admin                | Xem danh sách đơn hàng (sắp xếp theo ngày), xem chi tiết đơn hàng, cập nhật trạng thái đơn |
| order-service nội bộ | Gọi product-service, payment-service và email service                                      |

## Chức năng chính

- **Quản lý giỏ hàng**: Lưu giỏ hàng trong Redis với TTL 24 giờ
- **Tạo đơn từ giỏ hàng**: Return 202 Accepted, xử lý async qua Message Queue
- **Event-Driven Mediator Pattern**:
  - Publish `OrderCreated` event → RabbitMQ
  - Inventory Service lắng nghe → reserve stock
  - Payment Service lắng nghe → process payment
  - Notification Service lắng nghe → send email
- **Saga Pattern**: Compensating transactions khi bước nào thất bại (InventoryFailed, PaymentFailed)
- **Retry & Resilience**: Automatic retry cho message handlers
- **Order Status Tracking**: Theo dõi trạng thái đơn (PENDING → CONFIRMED → PROCESSING → ...)
- **Admin Dashboard**: Xem danh sách đơn, chi tiết đơn, cập nhật trạng thái
- **Chat AI Integration**: Tra cứu trạng thái đơn hàng

## API quan trọng

| Method | Path                     | Vai trò        | Mô tả                                       | Response         |
| ------ | ------------------------ | -------------- | ------------------------------------------- | ---------------- |
| GET    | `/cart`                  | Guest/Customer | Xem giỏ hàng                                | 200 OK           |
| POST   | `/cart/items`            | Guest/Customer | Thêm vào giỏ                                | 201 Created      |
| PATCH  | `/cart/items/:productId` | Guest/Customer | Cập nhật số lượng                           | 200 OK           |
| DELETE | `/cart/items/:productId` | Guest/Customer | Xóa khỏi giỏ                                | 204 No Content   |
| POST   | `/orders`                | Customer       | Tạo đơn hàng [Async via Message Queue]      | **202 Accepted** |
| GET    | `/orders`                | Customer/Admin | Lịch sử đơn hàng (xem trạng thái real-time) | 200 OK           |
| GET    | `/orders/:id`            | Customer/Admin | Chi tiết đơn hàng + events                  | 200 OK           |
| PATCH  | `/orders/:id/status`     | Admin          | Cập nhật trạng thái                         | 200 OK           |
| DELETE | `/orders/:id/cancel`     | Customer       | Hủy đơn (trigger CompensatingTransaction)   | 202 Accepted     |

**Lưu ý**: Endpoint `POST /orders` trả về **202 Accepted** (không phải 200/201) vì quy trình xử lý là asynchronous qua Message Queue.

## Dữ liệu chính

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

## Tiêu chí chấm điểm đáp ứng

| Tiêu chí               | Mô tả                                            | Status |
| ---------------------- | ------------------------------------------------ | ------ |
| Project Description    | Kết nối API Gateway, MySQL và sub-service        | ✅     |
| **Event-Driven [NEW]** | **Mediator Topology với RabbitMQ Message Queue** | ✅     |
| **Retry [UPGRADED]**   | **Automatic retry trong message handlers (3x)**  | ✅     |
| **Saga Pattern**       | Compensating transactions khi failure            | ✅     |
| Rate Limiter           | Giới hạn tạo đơn hàng (5 req/phút)               | ✅     |
| AI Apply               | Chat AI tra cứu trạng thái đơn                   | ✅     |
| UI                     | Giỏ hàng, đặt hàng, lịch sử đơn, Admin dashboard | ✅     |
