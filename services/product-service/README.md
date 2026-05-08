# Product Service (Spring Boot)

## Tổng quan

**product-service** quản lý catalog sản phẩm của hệ thống. Đây là service có lượng đọc cao nhất, nên Redis cache được dùng để giảm tải MySQL.

## Vai trò trong hệ thống

| Vai trò       | Trách nhiệm                             |
| ------------- | --------------------------------------- |
| Guest         | Xem danh sách và chi tiết sản phẩm      |
| Customer      | Tất cả quyền của Guest                  |
| Admin         | Tạo, cập nhật, ẩn hoặc xoá sản phẩm     |
| order-service | Kiểm tra tồn kho và lấy giá khi tạo đơn |

## Công nghệ

- Spring Boot 3.x
- Java 21
- Spring Web, Spring Data JPA, Spring Data Redis, Spring Validation
- MySQL + Redis

## Biến môi trường

```env
PORT=3003
SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/productdb
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password
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
