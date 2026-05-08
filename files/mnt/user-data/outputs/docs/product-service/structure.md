# Product Service — Project Structure

## Cấu trúc thư mục

```
src/
├── index.js
├── app.js
│
├── config/
│   ├── db.js
│   ├── redis.js
│   └── env.js
│
├── routes/
│   ├── product.routes.js       # /products, /products/:id
│   └── category.routes.js      # /categories
│
├── controllers/
│   ├── product.controller.js
│   └── category.controller.js
│
├── services/                   # [Business Layer]
│   ├── product.service.js      # getAll, getById (với cache), create, update, delete
│   └── category.service.js
│
├── repositories/               # [Persistence Layer]
│   ├── product.repository.js   # MySQL queries
│   ├── cache.repository.js     # Redis GET/SET/DEL/SETEX wrapper
│   └── category.repository.js
│
├── middlewares/
│   ├── authHeader.js
│   ├── requireAdmin.js
│   ├── rateLimiter.js
│   └── errorHandler.js
│
└── utils/
    ├── cacheKeys.js            # Định nghĩa key patterns: product:{id}, products:list
    └── logger.js
```

## API Endpoints

| Method | Path                  | Auth     | Mô tả              |
| ------ | --------------------- | -------- | ------------------ |
| GET    | `/products`           | Public   | Danh sách sản phẩm |
| GET    | `/products/:id`       | Public   | Chi tiết sản phẩm  |
| POST   | `/products`           | Admin    | Tạo sản phẩm mới   |
| PATCH  | `/products/:id`       | Admin    | Cập nhật sản phẩm  |
| DELETE | `/products/:id`       | Admin    | Soft delete        |
| PATCH  | `/products/:id/stock` | Internal | Cập nhật tồn kho   |
| GET    | `/categories`         | Public   | Danh sách danh mục |

## Database Schema

```sql
-- MySQL: productdb
CREATE TABLE categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    price           DECIMAL(15, 2) NOT NULL,
    stock_quantity  INT DEFAULT 0,
    image_url       VARCHAR(500),
    category_id     INT REFERENCES categories(id),
    status          ENUM('active','hidden') DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL
);
```

## Luồng dữ liệu chính

### Xem chi tiết sản phẩm (Cache-Aside)

```
GET /products/:id
    │
    ▼
ProductController.getById()
    │
    ▼
ProductService.getById(id)
    ├── CacheRepository.get("product:{id}")
    │   ├── HIT  → return parsed JSON  ──────────────────► Response 200
    │   └── MISS ↓
    ├── ProductRepository.findById(id)  → MySQL SELECT
    ├── CacheRepository.setex("product:{id}", 600, data)
    └── return product ──────────────────────────────────► Response 200
```

### Cập nhật sản phẩm (Admin)

```
PATCH /products/:id
    │
    ▼
requireAdmin middleware
    │
    ▼
ProductService.update(id, data)
    ├── ProductRepository.update(id, data)   → MySQL UPDATE
    └── CacheRepository.del("product:{id}") → Invalidate cache
    │
    ▼
Response 200 { success: true }
```

## Redis Key Patterns

## Ghi chú kiến trúc

> Redis cache dùng theo cache-aside để tối ưu truy vấn đọc nhiều.
> Khi cập nhật/xóa sản phẩm cần invalidate key liên quan để tránh stale data.

```
product:{id}          → JSON sản phẩm cụ thể, TTL 10 phút
products:list:{hash}  → Cache danh sách theo query params, TTL 2 phút
```
