# User Service — Product Description

## Tổng quan

**user-service** quản lý hồ sơ người dùng sau khi xác thực. Auth-service chịu trách nhiệm danh tính (identity), còn user-service tập trung vào profile và dữ liệu hiển thị cho khách hàng / admin.

## Vai trò trong hệ thống

| Vai trò  | Trách nhiệm                                  |
| -------- | -------------------------------------------- |
| Customer | Xem và cập nhật hồ sơ cá nhân                |
| Customer | Xem lịch sử đơn hàng thông qua order-service |
| Admin    | Quản lý danh sách người dùng                 |
| Admin    | Khoá / mở khoá / xoá tài khoản               |

## Chức năng chính

- Xem profile bản thân theo `userId` từ JWT payload
- Cập nhật `fullName`, `phone`, `address`
- Quản lý user cho admin: phân trang, lọc, khóa/mở khóa, soft delete
- Nhận header do API Gateway inject: `X-User-Id`, `X-User-Role`, `X-User-Email`

## API quan trọng

| Method | Path                | Vai trò  | Mô tả                |
| ------ | ------------------- | -------- | -------------------- |
| GET    | `/users/me`         | Customer | Xem profile bản thân |
| PATCH  | `/users/me`         | Customer | Cập nhật profile     |
| GET    | `/users`            | Admin    | Danh sách users      |
| GET    | `/users/:id`        | Admin    | Xem user bất kỳ      |
| PATCH  | `/users/:id/status` | Admin    | Khoá / mở khoá       |
| DELETE | `/users/:id`        | Admin    | Soft delete          |

## Dữ liệu chính

```sql
-- MySQL: userdb
CREATE TABLE user_profiles (
	id          BIGINT PRIMARY KEY,
	email       VARCHAR(255) NOT NULL UNIQUE,
	full_name   VARCHAR(255),
	phone       VARCHAR(20),
	address     TEXT,
	role        ENUM('customer','admin') DEFAULT 'customer',
	status      ENUM('active','locked') DEFAULT 'active',
	created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	deleted_at  TIMESTAMP NULL
);
```

## Tiêu chí chấm điểm đáp ứng

| Tiêu chí            | Mô tả                                     |
| ------------------- | ----------------------------------------- |
| Project Description | Kết nối đúng vào API Gateway và MySQL     |
| UI                  | Trang profile và trang admin quản lý user |
| Deploy              | Test được qua API Gateway                 |
