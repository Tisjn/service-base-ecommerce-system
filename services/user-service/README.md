# User Service (Spring Boot)

## Tổng quan

**user-service** quản lý hồ sơ người dùng sau khi đã xác thực. Auth-service chịu trách nhiệm danh tính, còn user-service tập trung vào profile và dữ liệu hiển thị cho khách hàng và admin.

## Vai trò trong hệ thống

| Vai trò  | Trách nhiệm                                                   |
| -------- | ------------------------------------------------------------- |
| Customer | Xem và cập nhật hồ sơ cá nhân                                 |
| Customer | Xem lịch sử đơn hàng thông qua order-service                  |
| Admin    | Xem danh sách tài khoản và chi tiết (không hiển thị mật khẩu) |
| Admin    | Cập nhật thông tin người dùng                                 |
| Admin    | Khoá, mở khoá và xoá tài khoản (chỉ khi chưa từng đặt hàng)   |

## Công nghệ

- Spring Boot 3.x
- Java 21
- Spring Web, Spring Data JPA, Spring Validation, Spring Security
- MySQL

## Biến môi trường

```env
PORT=3002
RDS_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=true

SPRING_DATASOURCE_URL=jdbc:mysql://${RDS_HOST}:${RDS_PORT}/userdb?useSSL=${RDS_SSL}&requireSSL=${RDS_SSL}
SPRING_DATASOURCE_USERNAME=${RDS_USER}
SPRING_DATASOURCE_PASSWORD=${RDS_PASSWORD}
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
- User-service chỉ quản lý profile và dữ liệu hiển thị; mật khẩu vẫn do auth-service quản lý nên không trả về trong API.
- Admin có thể xem danh sách tài khoản, xem chi tiết tài khoản, cập nhật thông tin và soft delete; xoá chỉ được thực hiện khi user chưa từng đặt hàng.
- `GET /users/:id` trả về dữ liệu hiển thị mà không bao gồm password.
