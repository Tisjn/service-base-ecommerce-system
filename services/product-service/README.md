# Product Service (Spring Boot)

## Tổng quan

**product-service** quản lý catalog sản phẩm của hệ thống. Đây là service có lượng đọc cao nhất, nên Redis cache được dùng để giảm tải MySQL.

## Vai trò trong hệ thống

| Vai trò       | Trách nhiệm                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| Guest         | Xem danh sách sản phẩm/dịch vụ (lấy từ CSDL)                                                                    |
| Guest         | Xem chi tiết sản phẩm/dịch vụ                                                                                   |
| Guest         | Thêm sản phẩm/dịch vụ vào giỏ hàng                                                                              |
| Guest         | Xem giỏ hàng (dữ liệu lưu trong Session)                                                                        |
| Guest         | Cập nhật số lượng (0 → xóa khỏi giỏ)                                                                            |
| Customer      | Bắt buộc đăng nhập/đăng ký trước khi đặt hàng                                                                   |
| Admin         | Xem danh sách sản phẩm, xem chi tiết, tạo mới, cập nhật, ẩn hoặc xoá sản phẩm (chỉ khi chưa phát sinh đơn hàng) |
| order-service | Kiểm tra tồn kho và lấy giá khi tạo đơn                                                                         |

## Công nghệ

- Spring Boot 3.x
- Java 21
- Spring Web, Spring Data JPA, Spring Data Redis, Spring Validation
- MySQL + Redis

## Biến môi trường

```env
PORT=3003
RDS_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=true

SPRING_DATASOURCE_URL=jdbc:mysql://${RDS_HOST}:${RDS_PORT}/productdb?useSSL=${RDS_SSL}&requireSSL=${RDS_SSL}
SPRING_DATASOURCE_USERNAME=${RDS_USER}
SPRING_DATASOURCE_PASSWORD=${RDS_PASSWORD}
SPRING_REDIS_HOST=redis-cache
SPRING_REDIS_PORT=6379
```

## Chạy ứng dụng

```bash
mvn spring-boot:run
```

Hoặc chạy Docker:

```bash
docker build -t product-service .
docker run --rm -p 3003:3003 product-service
```

## API chính

- `GET /products`
- `GET /products/:id`
- `POST /products`
- `PATCH /products/:id`
- `DELETE /products/:id`
- `PATCH /products/:id/stock`
- `GET /categories`

## Ghi chú

- Redis dùng theo mô hình cache-aside cho sản phẩm và danh sách sản phẩm.
- Khi cập nhật hoặc xoá sản phẩm cần invalidate cache liên quan.
- `DELETE /products/:id` nên chỉ dùng khi sản phẩm chưa phát sinh đơn hàng; nếu đã có đơn thì ưu tiên ẩn sản phẩm thay vì xoá hoàn toàn.
