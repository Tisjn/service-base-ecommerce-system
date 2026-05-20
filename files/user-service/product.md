# User Service — Product & Workflow

## Mô tả sản phẩm

**User Service** quản lý hồ sơ người dùng của hệ thống sau khi xác thực (auth-service chịu trách nhiệm đăng ký/đăng nhập).

### Chức năng chính

1. **Lấy hồ sơ cá nhân** — Customer xem info của mình
2. **Cập nhật hồ sơ** — Customer thay đổi phone, address, etc
3. **Admin quản lý người dùng** — Xem, khoá, xoá tài khoản

### Quy tắc nghiệp vụ

| Chức năng              | Guest | Customer | Admin             |
| ---------------------- | ----- | -------- | ----------------- |
| Xem hồ sơ của mình     | ❌    | ✅       | ✅ (chính mình)   |
| Xem hồ sơ người khác   | ❌    | ❌       | ✅                |
| Cập nhật thông tin     | ❌    | ✅       | ✅                |
| Khoá/mở khoá tài khoản | ❌    | ❌       | ✅                |
| Xoá tài khoản          | ❌    | ❌       | ✅ (if no orders) |

## Workflow — Customer

```
Customer Đăng nhập
    │
    ▼
JWT token nhận từ auth-service
    │
    ▼
Frontend gọi GET /users/me
    + Header: Authorization: Bearer <token>
    │
    ▼
API Gateway
    ├── Verify JWT → lấy userId
    ├── Set X-User-Id header
    └── Forward to user-service
    │
    ▼
UserService.getUserById(userId)
    │
    ▼
Trả về hồ sơ (không password)
    │
    ▼
Frontend hiển thị profile
```

## Workflow — Admin Quản Lý Người Dùng

```
Admin truy cập /admin/users
    │
    ▼
Gọi GET /users
    + Header: X-User-Role: ADMIN
    │
    ▼
API Gateway verify → forward
    │
    ▼
UserController.listAllUsers()
    ├── @PreAuthorize("hasRole('ADMIN')")
    └── UserRepository.findAll()
    │
    ▼
Trả về danh sách users (20 item)
    │
    ▼
Admin click vào user → GET /users/{id}
    │
    ▼
Xem chi tiết user
    │
    ▼
Admin click "Khoá" → PATCH /users/{id}/status
    ├── Request body: { status: "locked" }
    └── Database update: user.status = LOCKED
    │
    ▼
Xóa tài khoản? → DELETE /users/{id}
    ├── Check: User có từng đặt hàng?
    │   ├── Yes: 400 "Không thể xoá"
    │   └── No: soft delete (set deleted_at)
    │
    ▼
Notification: "Đã xoá tài khoản"
```

## API Response Format

### Get Profile (200 OK)

```json
{
  "id": 123,
  "email": "customer@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+84912345678",
  "address": "123 Main St, HCM",
  "status": "ACTIVE",
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-05-20T14:22:00Z"
}
```

**Note:** Không trả về `password` trong bất kỳ endpoint nào.

### List Users (200 OK)

```json
[
  {
    "id": 1,
    "email": "user1@example.com",
    "firstName": "User",
    "lastName": "One",
    "status": "ACTIVE",
    "createdAt": "2026-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "email": "user2@example.com",
    "firstName": "User",
    "lastName": "Two",
    "status": "LOCKED",
    "createdAt": "2026-01-20T08:15:00Z"
  }
]
```

### Update Profile (200 OK)

```json
{
  "id": 123,
  "email": "customer@example.com",
  "firstName": "Jonathan",
  "lastName": "Doe",
  "phone": "+84987654321",
  "address": "456 Oak Ave, Da Nang",
  "status": "ACTIVE",
  "updatedAt": "2026-05-20T14:30:00Z"
}
```

### Lock Account (200 OK)

```json
{
  "id": 123,
  "status": "LOCKED",
  "reason": "Admin locked this account",
  "updatedAt": "2026-05-20T14:35:00Z"
}
```

### Delete Account (204 No Content)

```
HTTP/1.1 204 No Content
```

## Integration Points

| Service       | Gọi                   | Mục đích                           |
| ------------- | --------------------- | ---------------------------------- |
| auth-service  | User-service receives | Lấy userId từ JWT                  |
| order-service | User-service listens  | Check user có orders trước khi xoá |
| api-gateway   | User-service calls    | Receive X-User-Id header           |

## Database Schema (userdb)

```sql
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  status ENUM('ACTIVE', 'LOCKED', 'DELETED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,

  INDEX idx_email (email),
  INDEX idx_status (status)
);
```

---
