# User Service (Spring Boot)

## Tổng quan

**user-service** quản lý hồ sơ người dùng sau khi đã xác thực. Auth-service chịu trách nhiệm danh tính, còn user-service tập trung vào profile và dữ liệu hiển thị cho khách hàng và admin.

## Vai trò trong hệ thống

| Vai trò  | Trách nhiệm                                  |
| -------- | -------------------------------------------- |
| Customer | Xem và cập nhật hồ sơ cá nhân                |
| Customer | Xem lịch sử đơn hàng thông qua order-service |
| Admin    | Quản lý danh sách người dùng                 |
| Admin    | Khoá, mở khoá, xoá tài khoản                 |

## Công nghệ

- Spring Boot 3.x
- Java 21
- Spring Web, Spring Data JPA, Spring Validation, Spring Security
- MySQL

## Biến môi trường

```env
PORT=3002
SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/userdb
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password
ORDER_SERVICE_URL=http://order-service:3004
```

## Chạy ứng dụng

```bash
mvn spring-boot:run
```

Hoặc chạy Docker:

```bash
docker build -t user-service .
docker run --rm -p 3002:3002 user-service
```

## API chính

- `GET /users/me`
- `PATCH /users/me`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id/status`
- `DELETE /users/:id`

## Ghi chú

- API Gateway inject `X-User-Id`, `X-User-Role`, `X-User-Email` sau khi verify JWT.
- User-service tin vào header đã được gateway xác thực thay vì tự verify token lại.
