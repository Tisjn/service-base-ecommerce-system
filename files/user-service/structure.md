# User Service — Project Structure

**Port:** 3002 | **Framework:** Spring Boot 3.x | **Language:** Java 21

## Cấu trúc thư mục

```
src/
├── main/java/com/example/userservice/
│   │
│   ├── controller/
│   │   └── UserController.java             # REST endpoints
│   │
│   ├── service/
│   │   └── UserService.java                # Business logic
│   │
│   ├── repository/
│   │   └── UserRepository.java             # JPA repository
│   │
│   ├── entity/
│   │   └── User.java                       # JPA entity
│   │
│   ├── dto/
│   │   ├── UserDTO.java
│   │   ├── CreateUserRequest.java
│   │   └── UpdateUserRequest.java
│   │
│   ├── config/
│   │   ├── SecurityConfig.java             # JWT verification
│   │   └── JwtFilter.java                  # Header validation
│   │
│   ├── exception/
│   │   └── GlobalExceptionHandler.java     # Error handling
│   │
│   └── UserServiceApplication.java         # Main entry point
│
└── resources/
    ├── application.yml                     # Configuration
    └── schema.sql                          # Database setup
```

## API Endpoints

| Method | Path                 | Auth  | Mô tả                         |
| ------ | -------------------- | ----- | ----------------------------- |
| GET    | `/users/me`          | JWT   | Lấy hồ sơ người dùng hiện tại |
| PATCH  | `/users/me`          | JWT   | Cập nhật hồ sơ của mình       |
| GET    | `/users`             | Admin | Danh sách tất cả người dùng   |
| GET    | `/users/{id}`        | Admin | Chi tiết người dùng           |
| PATCH  | `/users/{id}/status` | Admin | Khoá/mở khoá tài khoản        |
| DELETE | `/users/{id}`        | Admin | Xoá người dùng                |

## Luồng dữ liệu — Get Profile

```
GET /users/me
    │
    ▼
JwtFilter.doFilterInternal()
    ├── Header có X-User-Id?
    ├── Yes → pass to controller
    └── No → 401 Unauthorized
    │
    ▼
UserController.getCurrentUser(userId)
    │
    ▼
UserService.getUserById(userId)
    │
    ▼
UserRepository.findById(userId)
    ├── Found → return UserDTO (không có password)
    └── Not Found → 404
    │
    ▼
Response: { id, email, firstName, lastName, phone, address, status }
```

## Luồng dữ liệu — Update Profile

```
PATCH /users/me
    │
    ▼
Validate request body
    │
    ▼
UserController.updateCurrentUser(userId, request)
    │
    ▼
UserService.updateUser(userId, request)
    │
    ▼
UserRepository.findById(userId)
    ├── Update fields
    └── Save to MySQL
    │
    ▼
Response: { Updated user data }
```

## Luồng dữ liệu — Admin: List Users

```
GET /users
    │
    ▼
JwtFilter.doFilterInternal()
    ├── X-User-Role = "ADMIN"?
    ├── Yes → pass to controller
    └── No → 403 Forbidden
    │
    ▼
UserController.listAllUsers()
    │
    ▼
UserRepository.findAll()
    │
    ▼
Response: [ { User1 }, { User2 }, ... ]
```

## Luồng dữ liệu — Admin: Lock Account

```
PATCH /users/{id}/status
    │
    ▼
Validate X-User-Role = "ADMIN"
    │
    ▼
UserController.updateUserStatus(id, { status: "locked" })
    │
    ▼
UserService.updateUserStatus(id, status)
    │
    ▼
UserRepository.findById(id)
    ├── Update status field (active/locked)
    └── Save to MySQL
    │
    ▼
Response: { id, status, updatedAt }
```

## Luồng dữ liệu — Admin: Delete User

```
DELETE /users/{id}
    │
    ▼
Validate X-User-Role = "ADMIN"
    │
    ▼
UserService.deleteUser(id)
    ├── Check if user has placed orders
    │   ├── Yes: return 400 "Không thể xoá"
    │   └── No: soft delete (set deleted_at)
    │
    ▼
UserRepository.save(user)  → MySQL soft delete
    │
    ▼
Response: 204 No Content
```

---
