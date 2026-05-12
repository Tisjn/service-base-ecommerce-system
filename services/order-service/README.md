# Order Service (Spring Boot)

## Tổng quan

**order-service** điều phối luồng giỏ hàng, tạo đơn, thanh toán và thông báo. Đây là service phức tạp nhất trong hệ thống vì phải xử lý nhiều bước liên tiếp và có retry / rollback rõ ràng.

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
- Spring Web, Spring Data JPA, Spring Data Redis, Spring Mail, Spring Retry
- MySQL + Redis

## Biến môi trường

```env
PORT=3004
RDS_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=true

SPRING_DATASOURCE_URL=jdbc:mysql://${RDS_HOST}:${RDS_PORT}/orderdb?useSSL=${RDS_SSL}&requireSSL=${RDS_SSL}
SPRING_DATASOURCE_USERNAME=${RDS_USER}
SPRING_DATASOURCE_PASSWORD=${RDS_PASSWORD}
SPRING_REDIS_HOST=redis-cache
SPRING_REDIS_PORT=6379
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

- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:productId`
- `DELETE /cart/items/:productId`
- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `PATCH /orders/:id/status`
- `DELETE /orders/:id/cancel`

## Ghi chú

- Luồng tạo đơn nên có retry cho các lời gọi external.
- Redis dùng để lưu giỏ hàng và cache tạm.
- Với `POST /orders`: hệ thống xử lý thanh toán mock, lưu `orders` + `order_items` vào MySQL, gửi email/thông báo thành công và xóa Session giỏ hàng khi đơn được tạo thành công.
- Admin có thể xem danh sách đơn hàng theo ngày, xem chi tiết đơn hàng và cập nhật trạng thái.
- Nếu mở rộng, `order-service` sẽ hỗ trợ admin cập nhật số lượng mặt hàng trong đơn trước khi đơn được xử lý.
