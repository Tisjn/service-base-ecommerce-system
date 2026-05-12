# Product Service — Product Description

## Tổng quan

**product-service** quản lý catalog sản phẩm của hệ thống và là service có lượng đọc cao nhất. Guest/Customer xem sản phẩm, còn Admin có thể xem danh sách, xem chi tiết, tạo mới, cập nhật, ẩn hoặc xóa sản phẩm (chỉ khi chưa phát sinh đơn hàng). Redis cache được dùng để giảm tải MySQL.

## Vai trò trong hệ thống

| Vai trò       | Trách nhiệm                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Guest         | Xem danh sách sản phẩm/dịch vụ (lấy từ CSDL)                                                                                      |
| Guest         | Xem chi tiết sản phẩm/dịch vụ                                                                                                     |
| Guest         | Thêm sản phẩm/dịch vụ vào giỏ hàng                                                                                                |
| Guest         | Xem giỏ hàng (dữ liệu lưu trong Session)                                                                                          |
| Guest         | Cập nhật số lượng (0 → xóa khỏi giỏ)                                                                                              |
| Customer      | Bắt buộc đăng nhập/đăng ký trước khi đặt hàng                                                                                     |
| Admin         | Xem danh sách sản phẩm, xem chi tiết, tạo mới, cập nhật, ẩn hoặc xóa sản phẩm (chỉ khi chưa phát sinh đơn hàng), quản lý danh mục |
| order-service | Kiểm tra tồn kho và lấy giá khi tạo đơn                                                                                           |

## Chức năng chính

- Danh sách sản phẩm: phân trang, filter, search, sort
- Chi tiết sản phẩm: cache Redis `product:{id}` TTL 10 phút
- Admin xem danh sách sản phẩm, xem chi tiết, tạo mới, cập nhật, ẩn/xóa mềm (chỉ khi chưa phát sinh đơn hàng)
- CRUD sản phẩm cho admin: tạo mới, cập nhật, ẩn/xóa mềm
- Quản lý tồn kho: giảm số lượng khi order-service xác nhận đơn

## API quan trọng

| Method | Path                  | Vai trò  | Mô tả                                         |
| ------ | --------------------- | -------- | --------------------------------------------- |
| GET    | `/products`           | Public   | Danh sách sản phẩm                            |
| GET    | `/products/:id`       | Public   | Chi tiết sản phẩm                             |
| POST   | `/products`           | Admin    | Tạo sản phẩm                                  |
| PATCH  | `/products/:id`       | Admin    | Cập nhật sản phẩm                             |
| DELETE | `/products/:id`       | Admin    | Soft delete (chỉ khi chưa phát sinh đơn hàng) |
| PATCH  | `/products/:id/stock` | Internal | Cập nhật tồn kho                              |
| GET    | `/categories`         | Public   | Danh mục sản phẩm                             |

## Dữ liệu chính

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

## Tiêu chí chấm điểm đáp ứng

| Tiêu chí                    | Mô tả                                       |
| --------------------------- | ------------------------------------------- |
| Redis CRUD 1 object         | Cache sản phẩm: Create/Read/Update/Delete   |
| Project Description – Redis | product-service sử dụng redis-cache service |
| UI                          | Danh sách, chi tiết và trang admin          |
| Deploy                      | Test được online                            |
