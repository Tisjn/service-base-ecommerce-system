# OVERVIEW — Kiến trúc hệ thống ShopNova

## 1. Tổng quan hệ thống

ShopNova là hệ thống thương mại điện tử theo kiến trúc **Microservices**, gồm các service độc lập giao tiếp qua **API Gateway**. Hệ thống được thiết kế để đồng thời đáp ứng:

- **Đồ án môn học** với các service Spring Boot 3.x trên Java 21, MVC, JPA, Session và REST API
- **Tiêu chí chấm kiến trúc** gồm JWT, Redis, Docker, CI/CD, Rate Limiter, Retry và AI

---

## 2. Lý do chọn ngôn ngữ theo từng service

> **Nguyên tắc**: Ưu tiên **Spring Boot 3.x trên Java 21** cho các service nghiệp vụ. Chỉ dùng **Node.js** cho lớp hạ tầng gateway và auth khi phù hợp về mặt kỹ thuật.

| Service             | Ngôn ngữ              | Lý do                                                                                              |
| ------------------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| **api-gateway**     | **Node.js**           | Gateway nhẹ, tập trung routing/proxy, inject header JWT và rate limit server                       |
| **auth-service**    | **Node.js**           | Xử lý đăng ký OTP qua SMTP, JWT access/refresh, Redis cho OTP và refresh token                     |
| **user-service**    | **Spring Boot**       | Quản lý profile người dùng theo mô hình Controller–Service–Repository, phù hợp JPA                 |
| **product-service** | **Spring Boot**       | Quản lý catalog sản phẩm, cache Redis theo cache-aside, phù hợp Spring Data JPA + Redis            |
| **order-service**   | **Spring Boot**       | Điều phối giỏ hàng, tạo đơn, payment và notification theo mô hình orchestrator                     |
| **payment-service** | **Spring Boot**       | Xử lý giao dịch, webhook và refund, cần transaction và audit log rõ ràng                           |
| **redis-cache**     | Redis 7 (container)   | Dùng chung cho auth-service (OTP + refresh token), product-service (cache) và order-service (cart) |
| **mysql**           | MySQL 8.0 (container) | Database chung cho các service Spring Boot, mỗi service dùng schema riêng                          |

---

## 3. Sơ đồ kiến trúc tổng thể

```
                    ┌─────────────────────────────────────────────┐
  [User Interface]  │                                             │
  [Chat AI]    ───► │  API Gateway (Node.js :8080)                │
                    │  - Routing                                  │
                    │  - JWT Verify (gọi auth-service)            │
                    │  - Rate Limiter Server                      │
                    │  - Inject X-User-* headers                  │
                    └──────────────┬──────────────────────────────┘
                                   │
               ┌───────────────────┼───────────────────────┐
               │                   │                       │
               ▼                   ▼                       ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │  auth-service    │  │  user-service    │  │ product-service  │
  │  (Node.js :3001) │  │ (Spring Boot     │  │ (Spring Boot     │
  │  - OTP SMTP      │  │  :3002)          │  │  :3003)          │
  │  - JWT access/   │  │  - Profile CRUD  │  │  - Catalog CRUD  │
  │    refresh       │  │  - Admin mgmt    │  │  - Redis cache   │
   └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
            │                     │                      │
            ▼                     ▼                      ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │  order-service   │  │ payment-service  │  │   redis-cache    │
  │ (Spring Boot     │  │ (Spring Boot     │  │  (Redis 7)       │
  │  :3004)          │  │  :3005)          │  │  - OTP TTL 5m    │
  │  - Orchestrator  │  │  - Webhook       │  │  - Refresh token │
  │  - Cart Session  │  │  - Refund        │  │  - Product cache │
  │  - Email notify  │  │  - Gateway adapter│ └──────────────────┘
   └──────────────────┘  └──────────────────┘
            │                     │
            └──────────┬──────────┘
                       ▼
              ┌─────────────────┐     ┌─────────────────┐
              │   MySQL 8.0     │     │  AI Provider    │
              │  - authdb       │     │  (External)     │
              │  - userdb       │     └─────────────────┘
              │  - productdb    │     ┌─────────────────┐
              │  - orderdb      │     │  Email (SMTP)   │
              │  - paymentdb    │     │  (External)     │
              └─────────────────┘     └─────────────────┘
```

---

## 4. Đáp ứng yêu cầu Đồ án môn học

| Yêu cầu đồ án                        | Service đáp ứng               | Ghi chú                                 |
| ------------------------------------ | ----------------------------- | --------------------------------------- |
| Spring Boot chạy ổn định             | user, product, order, payment | 4/5 services nghiệp vụ dùng Spring Boot |
| MVC: Controller–Service–Repository   | user, product, order, payment | Đúng mô hình phân tầng                  |
| Spring Data JPA                      | user, product, order, payment | Mapping entity đầy đủ                   |
| REST API JSON                        | Tất cả services               | Qua API Gateway                         |
| Giỏ hàng bằng Session                | order-service                 | HTTP Session trong Spring Boot          |
| Đăng ký / Đăng nhập                  | auth-service                  | OTP SMTP + JWT                          |
| Gửi email đặt hàng                   | order-service                 | Spring Mail (SMTP)                      |
| CRUD sản phẩm (Admin)                | product-service               | Full CRUD + cache invalidation          |
| Quản lý tài khoản (Admin)            | user-service                  | Xem, cập nhật, xóa                      |
| Quản lý đơn hàng (Admin)             | order-service                 | Danh sách, chi tiết, cập nhật           |
| Validation client + server           | Tất cả                        | Validation UI + Bean Validation         |
| **Spring Security** _(cộng điểm)_    | product, order, user          | JWT filter                              |
| **WebSocket realtime** _(cộng điểm)_ | order-service                 | Thông báo đơn hàng mới cho admin        |
| **ReactJS frontend** _(cộng điểm)_   | User Interface                | Tách riêng, gọi REST API                |

---

## 5. Đáp ứng tiêu chí chấm kiến trúc (10 điểm)

| #         | Tiêu chí              | Điểm   | Service                   | Cách đáp ứng                                   |
| --------- | --------------------- | ------ | ------------------------- | ---------------------------------------------- |
| 1         | Link Gitlab           | 0.5    | Tất cả                    | Cả 2 thành viên commit                         |
| 2         | Google Drive document | 0.5    | —                         | Slides + ảnh system diagram                    |
| 3         | Project Description   | 0.75   | api-gateway + redis + JWT | Diagram có đủ 3 thành phần                     |
| 4         | JWT                   | 0.5    | auth-service              | Login → trả token (0.25) + bảo vệ route (0.25) |
| 5         | Redis CRUD            | 0.5    | auth-service              | OTP: SET→GET→SET(update attempts)→DEL đủ 4 ops |
| 6         | Retry 3-5s            | 0.5    | order-service             | Spring Retry khi gọi product/payment service   |
| 7         | Rate Limiter client   | 0.5    | auth-service (Node.js)    | 5 req/phút → trả thông báo                     |
| 8         | Docker All Services   | 0.5    | Tất cả                    | 8 images ≥ 5                                   |
| 9         | Docker Compose        | 0.5    | —                         | File đầy đủ, chạy ≥ 3 services                 |
| 10        | Jenkins               | 1.0    | CI/CD                     | Hiểu + cài + chạy pipeline                     |
| 11        | Gitlab CI/CD          | 1.0    | .gitlab-ci.yml            | Hiểu + chạy CI/CD                              |
| 12        | Agile-Scrum           | 0.75   | —                         | Roadmap + Sprint + PO/Planning/Review/Retro    |
| 13        | Deploy                | 0.5    | api-gateway               | Test API online                                |
| 14        | Rate Limiter Server   | 0.5    | api-gateway (Node.js)     | Limit 100 req/phút/IP toàn gateway             |
| 15        | Terraform/Ansible     | 0.5    | —                         | Giải thích + chạy ví dụ cơ bản                 |
| 16        | AI Apply              | 0.5    | Chat AI                   | Tra cứu đơn hàng bằng ngôn ngữ tự nhiên        |
| 17        | UI                    | 0.5    | ReactJS                   | Trang sản phẩm, đặt hàng, profile, admin       |
| **TOTAL** |                       | **10** |                           |                                                |

---

## 6. Docker Compose — 8 images

| Container       | Image/Build              | Port | Runtime     |
| --------------- | ------------------------ | ---- | ----------- |
| api-gateway     | build: ./api-gateway     | 8080 | Node.js     |
| auth-service    | build: ./auth-service    | 3001 | Node.js     |
| user-service    | build: ./user-service    | 3002 | Spring Boot |
| product-service | build: ./product-service | 3003 | Spring Boot |
| order-service   | build: ./order-service   | 3004 | Spring Boot |
| payment-service | build: ./payment-service | 3005 | Spring Boot |
| redis-cache     | redis:7-alpine           | 6379 | Redis       |
| mysql           | mysql:8.0                | 3306 | MySQL       |

```yaml
version: "3.8"

services:
  api-gateway:
    build: ./api-gateway
    ports: ["8080:8080"]
    depends_on:
      [
        auth-service,
        user-service,
        product-service,
        order-service,
        payment-service,
      ]
    networks: [app-network]
    environment:
      - AUTH_SERVICE_URL=http://auth-service:3001
      - USER_SERVICE_URL=http://user-service:3002
      - PRODUCT_SERVICE_URL=http://product-service:3003
      - ORDER_SERVICE_URL=http://order-service:3004
      - PAYMENT_SERVICE_URL=http://payment-service:3005

  auth-service:
    build: ./auth-service
    ports: ["3001:3001"]
    depends_on: [mysql, redis-cache]
    networks: [app-network]
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=authdb
      - DB_USER=root
      - DB_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - REDIS_HOST=redis-cache
      - SMTP_HOST=smtp.gmail.com
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}

  user-service:
    build: ./user-service
    ports: ["3002:3002"]
    depends_on: [mysql]
    networks: [app-network]
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/userdb

  product-service:
    build: ./product-service
    ports: ["3003:3003"]
    depends_on: [mysql, redis-cache]
    networks: [app-network]
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/productdb
      - SPRING_REDIS_HOST=redis-cache

  order-service:
    build: ./order-service
    ports: ["3004:3004"]
    depends_on: [mysql, redis-cache]
    networks: [app-network]
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/orderdb
      - PAYMENT_SERVICE_URL=http://payment-service:3005
      - PRODUCT_SERVICE_URL=http://product-service:3003

  payment-service:
    build: ./payment-service
    ports: ["3005:3005"]
    depends_on: [mysql]
    networks: [app-network]
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/paymentdb

  redis-cache:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
    command: redis-server --appendonly yes
    networks: [app-network]

  mysql:
    image: mysql:8.0
    ports: ["3306:3306"]
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks: [app-network]

volumes:
  redis_data:
  mysql_data:

networks:
  app-network:
    driver: bridge
```

---

## 7. Thứ tự implement theo tuần (gợi ý)

| Tuần       | Công việc                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Tuần 1** | ERD + Use Case + System Diagram. Dựng MySQL schema. Setup Gitlab repo, phân chia nhánh                                           |
| **Tuần 2** | auth-service (Node.js): đăng ký OTP, đăng nhập JWT. product-service (Spring Boot): CRUD sản phẩm + REST API                      |
| **Tuần 3** | user-service + order-service (Spring Boot): giỏ hàng Session, tạo đơn, email notify. api-gateway (Node.js): routing + JWT verify |
| **Tuần 4** | payment-service. Docker + Docker Compose. Gitlab CI/CD. Deploy online. ReactJS UI. Chat AI                                       |

---

## 8. Lưu ý quan trọng

> ⚠️ **Spring Boot services dùng Java 21** theo yêu cầu đồ án. Không dùng Stored Procedure, Trigger, Check Constraint trong CSDL — chỉ validate trong Service layer.

> ⚠️ **Session chỉ dùng cho giỏ hàng** (order-service). Các service khác dùng JWT stateless, không lưu session.

> ✅ **Node.js chỉ dùng cho 2 service**: api-gateway (routing/proxy) và auth-service (OTP SMTP + JWT). Cả hai đều không có yêu cầu JPA hay Spring MVC nên không vi phạm tinh thần đồ án.

> 💡 **Điểm cộng**: WebSocket realtime (+4đ) implement ở order-service Spring Boot bằng `spring-boot-starter-websocket`. ReactJS frontend (+3đ) gọi REST API qua api-gateway port 8080.
