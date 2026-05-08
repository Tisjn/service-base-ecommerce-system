# Redis Cache — Product, Tech & Structure

## Product Description

**redis-cache** không phải là một microservice tự xây dựng mà là **Redis server** chạy dưới dạng Docker container độc lập, được tái sử dụng bởi nhiều service trong hệ thống. Theo tiêu chí chấm, hệ thống cần có Redis và một service cần CRUD một object trong Redis (0.5 điểm).

### Ai dùng Redis?

| Service | Mục đích | Key Pattern |
|---------|----------|-------------|
| **auth-service** | Lưu refresh token | `refresh:{userId}` |
| **product-service** | Cache chi tiết sản phẩm | `product:{id}` |
| **order-service** | Lưu giỏ hàng (cart) | `cart:{userId}` |

### CRUD Demo rõ ràng (auth-service — refresh token)

```
CREATE : SET refresh:42 "eyJhbGci..." EX 604800
READ   : GET refresh:42
UPDATE : SET refresh:42 "eyJhbGci...new" EX 604800   (overwrite)
DELETE : DEL refresh:42
```

---

## Tech Stack

- **Redis 7.x** (Alpine image — nhỏ gọn, ~30MB)
- Persistent: `appendonly yes` (AOF) để data không mất khi restart
- Không cần password trong dev, nên enable `requirepass` trong production

---

## Docker Compose Config

```yaml
# Trong docker-compose.yml
redis-cache:
  image: redis:7-alpine
  container_name: redis-cache
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes
  networks:
    - app-network
```

---

## Ghi chú kiến trúc

> ✅ **Về "Redis set service" trong tiêu chí**: Diagram Image 3 thể hiện `redis-cache` là một service riêng trong system diagram — đây là cách đúng để đạt 0.25 điểm cho tiêu chí "Redis set service".
>
> Đảm bảo:
> 1. `redis-cache` xuất hiện trong system diagram (Image 3 đã có ✓)
> 2. Ít nhất 1 service thực hiện đủ CRUD (auth-service refresh token là lựa chọn tốt nhất)
> 3. Container Redis chạy trong Docker Compose (đếm vào minimum 5 images — tiêu chí #8)
