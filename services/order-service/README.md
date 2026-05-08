# Order Service (Spring Boot)

## Tổng quan

**order-service** điều phối luồng giỏ hàng, tạo đơn, thanh toán và thông báo. Đây là service phức tạp nhất trong hệ thống vì phải xử lý nhiều bước liên tiếp và có retry / rollback rõ ràng.

## Vai trò trong hệ thống

| Vai trò              | Trách nhiệm                                           |
| -------------------- | ----------------------------------------------------- |
| Customer             | Thêm sản phẩm vào giỏ, tạo đơn, xem trạng thái đơn    |
| Customer             | Huỷ đơn nếu chưa xử lý                                |
| Admin                | Xem và cập nhật trạng thái đơn                        |
| order-service nội bộ | Gọi product-service, payment-service và email service |

## Công nghệ

- Spring Boot 3.x
- Java 21
- Spring Web, Spring Data JPA, Spring Data Redis, Spring Mail, Spring Retry
- MySQL + Redis

## Biến môi trường

```env
PORT=3004
SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/orderdb
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password
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
