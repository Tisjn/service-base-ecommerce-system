# Product Service — Project Structure

**Port:** 3003 | **Framework:** Spring Boot 3.x | **Language:** Java 21

## Cấu trúc thư mục

```
src/
├── main/java/com/example/productservice/
│   │
│   ├── controller/
│   │   ├── ProductController.java
│   │   ├── CategoryController.java
│   │   └── CartController.java
│   │
│   ├── service/
│   │   ├── ProductService.java
│   │   ├── CategoryService.java
│   │   ├── CartService.java
│   │   └── InventoryService.java
│   │
│   ├── repository/
│   │   ├── ProductRepository.java
│   │   ├── CategoryRepository.java
│   │   └── CartRepository.java
│   │
│   ├── entity/
│   │   ├── Product.java
│   │   ├── Category.java
│   │   └── CartItem.java
│   │
│   ├── cache/
│   │   ├── CacheManager.java
│   │   └── CacheKeys.java
│   │
│   ├── config/
│   │   ├── RedisConfig.java
│   │   └── SecurityConfig.java
│   │
│   ├── dto/
│   │   ├── ProductDTO.java
│   │   ├── CartItemDTO.java
│   │   └── CartDTO.java
│   │
│   └── ProductServiceApplication.java
│
└── resources/
    ├── application.yml
    └── schema.sql
```

## API Endpoints

| Method | Path                                   | Auth     | Mô tả                                   |
| ------ | -------------------------------------- | -------- | --------------------------------------- |
| GET    | `/api/products`                        | Public   | Danh sách sản phẩm (paginated + filter) |
| GET    | `/api/products/{id}`                   | Public   | Chi tiết sản phẩm                       |
| POST   | `/api/products`                        | Admin    | Tạo sản phẩm                            |
| PATCH  | `/api/products/{id}`                   | Admin    | Cập nhật sản phẩm                       |
| DELETE | `/api/products/{id}`                   | Admin    | Xoá sản phẩm                            |
| GET    | `/api/categories`                      | Public   | Danh sách categories                    |
| GET    | `/api/cart/{userId}`                   | Public   | Xem giỏ hàng                            |
| POST   | `/api/cart/{userId}/items`             | Public   | Thêm item vào cart                      |
| PATCH  | `/api/cart/{userId}/items/{productId}` | Public   | Cập nhật quantity                       |
| DELETE | `/api/cart/{userId}/items/{productId}` | Public   | Xóa item khỏi cart                      |
| POST   | `/api/inventory/reserve`               | Internal | Reserve stock                           |
| POST   | `/api/inventory/refund`                | Internal | Refund stock                            |

## Luồng dữ liệu — List Products

```
GET /api/products?page=0&size=20&categoryId=1&sortBy=price&direction=desc
    │
    ▼
ProductController.getProducts(pageable, filters)
    │
    ▼
Check Redis cache for category
    ├── Hit → return cached
    └── Miss → query DB
    │
    ▼
ProductRepository.findByCategoryAndStatusWithPagination()
    │
    ▼
Cache result in Redis (1 hour)
    │
    ▼
Response: { content: [...], totalElements, totalPages, hasNext }
```

## LuORng dữ liệu — Add to Cart

```
POST /api/cart/{userId}/items
    │
    ▼
Validate productId + quantity
    │
    ▼
ProductService.getProduct(productId)
    ├── Check Redis cache
    └── If miss, query DB
    │
    ▼
CartService.addToCart(userId, productId, quantity)
    │
    ▼
CartRepository.save() → Redis
    ├── Set cart:{userId} as JSON
    └── EXPIRE 86400 (24 hours)
    │
    ▼
Response: { userId, items: [...], total }
```

## Luồng dữ liệu — Reserve Inventory

```
POST /api/inventory/reserve (từ order-service)
    │
    ▼
Validate product + quantity
    │
    ▼
InventoryService.reserveStock(productId, quantity)
    ├── MySQL: UPDATE products SET stock = stock - quantity
    ├── Check: stock >= quantity?
    │   ├── Yes: success
    │   └── No: 400 "Out of stock"
    │
    ▼
Invalidate product cache
    │
    ▼
Response: { success, reservedQuantity }
```

---
