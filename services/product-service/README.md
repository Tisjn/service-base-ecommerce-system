# Product Service (Spring Boot)

## Tổng quan

**product-service** quản lý catalog sản phẩm, hình ảnh, giỏ hàng và tồn kho của hệ thống. Đây là service có lượng đọc cao nhất, nên Redis cache được dùng theo mô hình cache-aside để giảm tải MySQL.

## Vai trò trong hệ thống

| Vai trò       | Trách nhiệm                                                          |
| ------------- | -------------------------------------------------------------------- |
| Guest         | Xem danh sách sản phẩm/dịch vụ                                       |
| Guest         | Xem chi tiết sản phẩm/dịch vụ                                        |
| Guest         | Thêm, sửa, xoá giỏ hàng bằng `X-Guest-Token`                         |
| Guest         | Xem giỏ hàng của guest hoặc user                                     |
| Guest         | Cập nhật số lượng (0 → xóa khỏi giỏ)                                 |
| Customer      | Bắt buộc đăng nhập/đăng ký trước khi đặt hàng                        |
| Customer      | Mua hàng qua checkout và đồng bộ cart sau khi đăng nhập              |
| Admin         | Quản lý sản phẩm, ảnh, category, restore hoặc xoá vĩnh viễn sản phẩm |
| order-service | Kiểm tra đơn đã phát sinh trước khi cho phép xoá sản phẩm            |

## Công nghệ

- Spring Boot 3.x
- Java 21
- Spring Web, Spring Data JPA, Spring Data Redis, Spring Validation, Spring Retry
- MySQL + Redis

## Biến môi trường

```env
RDS_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=true

SPRING_DATASOURCE_URL=jdbc:mysql://${RDS_HOST}:${RDS_PORT}/ecommerce_data?useSSL=${RDS_SSL}&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=${RDS_USER}
SPRING_DATASOURCE_PASSWORD=${RDS_PASSWORD}
SPRING_REDIS_HOST=redis-cache
SPRING_REDIS_PORT=6379
SERVER_PORT=3003
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

- `GET /api/products` - hỗ trợ pagination: `?page=0&size=20`, filter theo category bằng `categoryId`, status bằng `status`, tìm kiếm theo tên/mô tả bằng `search`, filter theo khoảng giá bằng `minPrice` và `maxPrice`, sort bằng `sortBy={name|price|stock|createdAt}` và `direction={asc|desc}`
- `GET /api/products/{id}`
- `POST /api/product-images` - upload ảnh sản phẩm
- `POST /api/products`
- `PATCH /api/products/{id}`
- `DELETE /api/products/{id}`
- `PATCH /api/products/{id}/restore`
- `DELETE /api/products/{id}/permanent`
- `PATCH /api/products/{id}/stock`
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/{id}`
- `DELETE /api/categories/{id}`
- `GET /api/cart/{userId}`
- `POST /api/cart/{userId}/items`
- `PATCH /api/cart/{userId}/items/{productId}`
- `DELETE /api/cart/{userId}/items/{productId}`
- `DELETE /api/cart/{userId}`
- `POST /api/cart/merge`
- `POST /api/cart/{userId}/checkout`
- `POST /api/inventory/reserve`
- `POST /api/inventory/refund`

## Cart đồng bộ

- Mọi thao tác với giỏ hàng ở `product-service` được đồng bộ sang `order-service` qua HTTP client.
- Guest cart sử dụng `X-Guest-Token`; user cart dùng `userId`.
- Khi login hoặc checkout, cart guest sẽ được merge sang cart user để tránh mất dữ liệu.

## Category validation

- `name` phải có độ dài từ 3 đến 100 ký tự.
- `slug` chỉ cho phép chữ thường, số và dấu gạch ngang, độ dài từ 3 đến 100 ký tự.
- Category `name` và `slug` phải duy nhất.

## Ghi chú

- Redis dùng theo mô hình cache-aside cho sản phẩm và danh sách sản phẩm.
- Khi cập nhật hoặc xoá sản phẩm cần invalidate cache liên quan.
- Giỏ hàng (`/api/cart/*`) hiện được lưu trong `product-service` cho guest flow và đồng bộ với `order-service` cho user flow.
- Khi checkout, tồn kho sẽ được giữ (reserved) và giỏ hàng sẽ được xóa.
- `order-service` sử dụng `/api/inventory/reserve` và `/api/inventory/refund` để giữ và trả lại tồn kho khi tạo đơn hoặc thất bại thanh toán.
- `DELETE /products/:id` sẽ bị chặn nếu sản phẩm đang có đơn hàng hoặc đã được giữ tồn kho.
