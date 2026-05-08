# Order Service — Product Description

## Tổng quan

**order-service** điều phối toàn bộ quy trình đặt hàng và là service phức tạp nhất trong hệ thống. Service này xử lý giỏ hàng, tạo đơn, thanh toán, và thông báo.

## Vai trò trong hệ thống

| Vai trò              | Trách nhiệm                                           |
| -------------------- | ----------------------------------------------------- |
| Customer             | Thêm sản phẩm vào giỏ, tạo đơn, xem trạng thái đơn    |
| Customer             | Hủy đơn nếu chưa xử lý                                |
| Admin                | Xem và cập nhật trạng thái đơn                        |
| order-service nội bộ | Gọi product-service, payment-service và email service |

## Chức năng chính

- Quản lý giỏ hàng và tạo đơn hàng từ giỏ
- Orchestrator pattern cho luồng đặt hàng nhiều bước
- Xử lý compensating transaction nếu một bước thất bại
- Hỗ trợ tra cứu trạng thái đơn cho Chat AI

## API quan trọng

| Method | Path                     | Vai trò        | Mô tả               |
| ------ | ------------------------ | -------------- | ------------------- |
| GET    | `/cart`                  | Customer       | Xem giỏ hàng        |
| POST   | `/cart/items`            | Customer       | Thêm vào giỏ        |
| PATCH  | `/cart/items/:productId` | Customer       | Cập nhật số lượng   |
| DELETE | `/cart/items/:productId` | Customer       | Xóa khỏi giỏ        |
| POST   | `/orders`                | Customer       | Tạo đơn hàng        |
| GET    | `/orders`                | Customer       | Lịch sử đơn hàng    |
| GET    | `/orders/:id`            | Customer/Admin | Chi tiết đơn hàng   |
| PATCH  | `/orders/:id/status`     | Admin          | Cập nhật trạng thái |
| DELETE | `/orders/:id/cancel`     | Customer       | Hủy đơn             |

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

| Tiêu chí            | Mô tả                                          |
| ------------------- | ---------------------------------------------- |
| Project Description | Kết nối API Gateway, MySQL và sub-service      |
| Retry 3-5s          | Retry khi gọi product-service, payment-service |
| Rate Limiter        | Giới hạn tạo đơn hàng                          |
| AI Apply            | Chat AI tra cứu trạng thái đơn                 |
| UI                  | Giỏ hàng, đặt hàng, lịch sử đơn                |
