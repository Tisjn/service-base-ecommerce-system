# Product Service — Product & Workflow

## Mô tả sản phẩm

**Product Service** quản lý catalog sản phẩm của hệ thống, hỗ trợ:

- Guest: Xem sản phẩm, tìm kiếm, lọc, thêm vào giỏ
- Admin: CRUD sản phẩm và categories
- order-service: Reserve/refund inventory

### Quy tắc nghiệp vụ

| Chức năng        | Guest      | Customer   | Admin |
| ---------------- | ---------- | ---------- | ----- |
| Xem danh sách    | ✅         | ✅         | ✅    |
| Tìm kiếm/lọc     | ✅         | ✅         | ✅    |
| Xem chi tiết     | ✅         | ✅         | ✅    |
| Thêm vào giỏ     | ✅         | ✅         | ❌    |
| CRUD sản phẩm    | ❌         | ❌         | ✅    |
| Quản lý category | ❌         | ❌         | ✅    |
| Reserve stock    | (Internal) | (Internal) | ✅    |

## Workflow — Guest Browse Products

```
Guest truy cập homepage
    │
    ▼
GET /api/products?page=0&size=20
    │
    ▼
API Gateway (no auth required)
    │
    ▼
ProductController.getProducts()
    │
    ▼
Check Redis cache for "products:list:0"
    ├── Hit (1 hour TTL) → return cached
    └── Miss → query DB
    │
    ▼
ProductRepository.findByStatus("ACTIVE", pageable)
    │
    ▼
Store in Redis
    │
    ▼
Response: [
  {
    "id": 1,
    "name": "Laptop Dell XPS",
    "price": 1200.00,
    "stock": 25,
    "image": "..."
  },
  ...
]
```

## Workflow — Guest Add to Cart

```
Guest click "Add to Cart"
    │
    ▼
POST /api/cart/{userId}/items
    ├── userId = guest:session123
    └── body: { productId: 1, quantity: 2 }
    │
    ▼
CartService.addToCart()
    │
    ▼
ProductService.getProduct() → Redis/DB check
    │
    ▼
CartRepository.save() → Redis
    ├── Key: cart:guest:session123
    ├── Value: JSON cart object
    └── TTL: 24 hours
    │
    ▼
Response: {
  "userId": "guest:session123",
  "items": [
    {
      "productId": 1,
      "productName": "Laptop",
      "quantity": 2,
      "price": 1200.00,
      "subtotal": 2400.00
    }
  ],
  "total": 2400.00
}
```

## Workflow — Admin Create Product

```
Admin truy cập /admin/products/create
    │
    ▼
Form nhập thông tin sản phẩm
    │
    ▼
POST /api/products
    + Header: X-User-Role: ADMIN
    + Body: {
        "name": "New Product",
        "price": 99.99,
        "stock": 50,
        "categoryId": 1
      }
    │
    ▼
API Gateway verify role = ADMIN
    │
    ▼
ProductController.createProduct()
    │
    ▼
Validate request (name, price, stock > 0)
    │
    ▼
ProductRepository.save() → MySQL
    │
    ▼
Invalidate category cache
    │
    ▼
Response: { id: 156, "New Product", ... }
```

## Workflow — Order Reserve Stock

```
Customer checkout
    │
    ▼
OrderService.createOrder()
    │
    ▼
Call ProductService.reserveInventory()
    │
    ▼
POST /api/inventory/reserve (internal)
    │
    ▼
Validate: stock >= quantity?
    ├── Yes: UPDATE products SET stock -= quantity
    ├── Invalidate Redis cache
    └── Response: { success: true }
    │
    ├── No: 400 "Out of stock"
    │
    ▼
If reserve success → Create order
If reserve fail → 400 Error to customer
```

## API Response Examples

### List Products (200 OK)

```json
{
  "content": [
    {
      "id": 1,
      "name": "Laptop Dell XPS 13",
      "description": "Premium ultrabook",
      "categoryId": 5,
      "price": 1200.0,
      "stock": 25,
      "status": "ACTIVE",
      "images": ["https://..."],
      "createdAt": "2026-01-10T09:00:00Z"
    }
  ],
  "totalElements": 156,
  "totalPages": 8,
  "currentPage": 0,
  "hasNext": true
}
```

### Get Product (200 OK)

```json
{
  "id": 1,
  "name": "Laptop Dell XPS 13",
  "description": "Premium ultrabook with Intel i7, 16GB RAM",
  "categoryId": 5,
  "category": {
    "id": 5,
    "name": "Electronics"
  },
  "price": 1200.0,
  "stock": 25,
  "status": "ACTIVE",
  "images": ["https://..."],
  "specifications": {
    "processor": "Intel i7",
    "ram": "16GB",
    "storage": "512GB SSD"
  }
}
```

### Get Cart (200 OK)

```json
{
  "userId": "guest:abc123",
  "items": [
    {
      "productId": 1,
      "productName": "Laptop Dell XPS 13",
      "quantity": 2,
      "price": 1200.0,
      "subtotal": 2400.0
    }
  ],
  "total": 2400.0,
  "itemCount": 1
}
```

## Database Schema (productdb)

```sql
CREATE TABLE products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id BIGINT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  stock INT DEFAULT 0,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  images JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_category (category_id),
  INDEX idx_status (status)
);

CREATE TABLE categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user (user_id),
  INDEX idx_product (product_id)
);
```

---
