# User Service — Project Structure

## Cấu trúc thư mục

```
src/
├── index.js
├── app.js
│
├── config/
│   ├── db.js
│   └── env.js
│
├── routes/
│   └── user.routes.js          # /users/me, /users/:id, /users (admin)
│
├── controllers/
│   └── user.controller.js
│
├── services/
│   └── user.service.js         # Business logic: getProfile, updateProfile, listUsers
│
├── repositories/
│   └── user.repository.js      # MySQL queries
│
├── middlewares/
│   ├── authHeader.js           # Đọc X-User-Id, X-User-Role từ header (inject bởi Gateway)
│   ├── requireRole.js          # Kiểm tra role (admin/customer)
│   ├── rateLimiter.js
│   └── errorHandler.js
│
└── utils/
    ├── httpClient.js           # axios instance với axiosRetry config
    └── logger.js
```

## API Endpoints

| Method | Path                | Role     | Mô tả                                     |
| ------ | ------------------- | -------- | ----------------------------------------- |
| GET    | `/users/me`         | Customer | Xem profile bản thân                      |
| PATCH  | `/users/me`         | Customer | Cập nhật profile                          |
| GET    | `/users`            | Admin    | Danh sách users (phân trang)              |
| GET    | `/users/:id`        | Admin    | Xem user bất kỳ (không hiển thị mật khẩu) |
| PATCH  | `/users/:id/status` | Admin    | Khoá/mở khoá                              |
| DELETE | `/users/:id`        | Admin    | Soft delete (chỉ khi chưa từng đặt hàng)  |

## Database Schema

```sql
-- MySQL: userdb
CREATE TABLE user_profiles (
    id          BIGINT PRIMARY KEY,           -- Sync với auth-service user.id
    email       VARCHAR(255) NOT NULL UNIQUE,
    full_name   VARCHAR(255),
    phone       VARCHAR(20),
    address     TEXT,
    role        ENUM('customer','admin') DEFAULT 'customer',
    status      ENUM('active','locked') DEFAULT 'active',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP NULL               -- Soft delete
);
```

## Luồng dữ liệu chính

```text
GET /users/me
    │
    ▼
authHeader middleware
    │
    ▼
user.service.getProfile(userId)
    ├── user.repository.findById(userId) → MySQL SELECT
    └── return profile
```

```text
PATCH /users/me
    │
    ▼
authHeader middleware + validateRequest
    │
    ▼
user.service.updateProfile(userId, payload)
    ├── user.repository.update(userId, payload) → MySQL UPDATE
    └── return updated profile
```

## Ghi chú kiến trúc

> 💡 **Đề xuất**: Trong diagram (Image 1), auth-service và user-service tách biệt. Điều này hợp lý vì:
>
> - auth-service: chỉ quan tâm credentials (email, password, token)
> - user-service: quan tâm profile (tên, địa chỉ, lịch sử)
>
> Hai service dùng chung MySQL server nhưng **database riêng** (authdb, userdb) để tránh coupling.
>
> **Đồng bộ dữ liệu**: Nếu hệ thống cần tạo profile tự động sau khi đăng ký ở auth-service, có thể dùng event hoặc HTTP callback để sinh bản ghi ban đầu cho user-service. Đây là điểm tích hợp cần thống nhất ở tầng kiến trúc.
