# OVERVIEW — Kiến trúc hệ thống DTPShop

**Updated:** May 20, 2026 | **Status:** ✅ Synchronized with 8 Services

---

## 1. Tổng quan hệ thống

DTPShop là hệ thống thương mại điện tử theo kiến trúc **Service-Based** với **8 microservices** độc lập giao tiếp qua **API Gateway**. Hệ thống được thiết kế để đồng thời đáp ứng:

- **Đồ án môn học** với các service Spring Boot 3.x trên Java 21, MVC, JPA, Session và REST API
- **Tiêu chí chấm kiến trúc** gồm JWT, Redis, Docker, CI/CD, Rate Limiter, Retry và AI

---

## 2. 8 Services Chính

| #   | Service             | Port | Ngôn ngữ    | Vai trò                                                    |
| --- | ------------------- | ---- | ----------- | ---------------------------------------------------------- |
| 1   | **api-gateway**     | 3000 | Node.js     | Điểm nhập duy nhất, JWT verification, rate limiting        |
| 2   | **auth-service**    | 3001 | Node.js     | Đăng ký/đăng nhập (OTP+JWT), refresh token, password reset |
| 3   | **user-service**    | 3002 | Spring Boot | Quản lý hồ sơ người dùng, admin quản lý tài khoản          |
| 4   | **product-service** | 3003 | Spring Boot | Catalog sản phẩm, Redis cache-aside, giỏ hàng              |
| 5   | **order-service**   | 3004 | Spring Boot | Orchestrator, guest cart (Redis), tạo đơn, webhook         |
| 6   | **payment-service** | 3005 | Spring Boot | Xử lý thanh toán (MoMo mock + COD), webhook                |
| 7   | **chat-service**    | 3007 | Node.js     | Real-time messaging (Socket.io), file upload               |
| 8   | **ai-service**      | 3009 | Spring Boot | Customer support assistant (Google Gemini)                 |

---

## 3. Lý do chọn ngôn ngữ theo từng service

> **Nguyên tắc**: Ưu tiên **Spring Boot 3.x trên Java 21** cho business logic. **Node.js** chỉ cho infrastructure (Gateway, Auth OTP, Chat real-time).

| Service             | Ngôn ngữ    | Lý do                                                     |
| ------------------- | ----------- | --------------------------------------------------------- |
| **api-gateway**     | Node.js     | Gateway nhẹ, routing/proxy, inject JWT header, rate limit |
| **auth-service**    | Node.js     | Nodemailer (SMTP OTP), async I/O, JWT + bcrypt            |
| **user-service**    | Spring Boot | Profile CRUD, JPA repository pattern                      |
| **product-service** | Spring Boot | Catalog, Redis cache-aside, Spring Data JPA               |
| **order-service**   | Spring Boot | Orchestration, RabbitMQ events, transaction               |
| **payment-service** | Spring Boot | Transaction, webhook, audit log                           |
| **chat-service**    | Node.js     | Socket.io real-time, DynamoDB messages                    |
| **ai-service**      | Spring Boot | JDBC + context filtering, Gemini API                      |

---

## 4. Sơ đồ kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│                   Frontend (React 5173)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│         API Gateway (Node.js :3000)                              │
│         • Routing to 7 services                                  │
│         • JWT verification                                       │
│         • Rate limiting                                          │
│         • Inject X-User-Id, X-User-Role, X-User-Email headers   │
└──────┬───────┬─────────┬──────┬────────┬────────┬────────┬──────┘
       │       │         │      │        │        │        │
       │ :3001 │ :3002   │:3003 │ :3004  │ :3005  │ :3007  │ :3009
       ▼       ▼         ▼      ▼        ▼        ▼        ▼
    ┌────┐ ┌──────┐ ┌──────┐┌───────┐┌────────┐┌──────┐┌────────┐
    │    │ │User  ││Prod  ││Order  ││Payment ││Chat  ││  AI    │
    │Auth│ │Srv   ││Srv   ││Srv    ││Srv     ││Srv   ││Srv     │
    └──┬─┘ └──┬───┘└──┬───┘└───┬───┘└────┬───┘└──┬───┘└────┬───┘
       │      │       │        │        │       │       │
    ┌──┴──────┴───────┴────────┴────────┴───────┴───────┴───┐
    │        AWS RDS MySQL (ecommerce_data)                 │
    │ ┌────────┬────────┬──────────┬──────────┬──────────┐  │
    │ │authdb  │userdb  │productdb │orderdb   │paymentdb │  │
    │ └────────┴────────┴──────────┴──────────┴──────────┘  │
    └────────────────────────────────────────────────────────┘

    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Redis       │  │  RabbitMQ    │  │  DynamoDB    │
    │  • Product   │  │  • Events    │  │  • Chat msgs │
    │    cache     │  │  • Order.    │  │  • Upload    │
    │  • Cart      │  │    created   │  │    files     │
    │    (24h)     │  │  • Order.    │  │              │
    │  • Session   │  │    cancelled │  │              │
    │  • OTP       │  │              │  │              │
    └──────────────┘  └──────────────┘  └──────────────┘

    ┌──────────────┐  ┌──────────────┐
    │ AWS S3       │  │ External API │
    │ • Images     │  │ • Email      │
    │ • Uploads    │  │ • MoMo Pay   │
    │ • Avatars    │  │ • Gemini AI  │
    └──────────────┘  └──────────────┘
```

---

## 5. Đáp ứng yêu cầu Đồ án môn học

| Yêu cầu đồ án                        | Service đáp ứng                 | Ghi chú                                                                                   |
| ------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------- |
| Spring Boot chạy ổn định             | user, product, order, payment   | 4/5 services nghiệp vụ dùng Spring Boot                                                   |
| MVC: Controller–Service–Repository   | user, product, order, payment   | Đúng mô hình phân tầng                                                                    |
| Spring Data JPA                      | user, product, order, payment   | Mapping entity đầy đủ                                                                     |
| REST API JSON                        | Tất cả services                 | Qua API Gateway                                                                           |
| Giỏ hàng bằng Session                | order-service                   | Session chỉ định danh guest cart; dữ liệu cart lưu trong Redis                            |
| Đăng ký / Đăng nhập / Đăng xuất      | auth-service                    | OTP SMTP + JWT                                                                            |
| Đặt hàng cho Customer                | order-service                   | Customer kế thừa toàn bộ chức năng Guest và bắt buộc đăng nhập/đăng ký trước khi checkout |
| Thanh toán đơn hàng (mock)           | order-service + payment-service | Gọi payment-service mock gateway                                                          |
| Lưu đơn hàng vào CSDL                | order-service                   | Lưu `orders` + `order_items` vào AWS RDS MySQL                                            |
| Gửi email đặt hàng                   | order-service                   | Spring Mail (SMTP)                                                                        |
| Xóa cart sau checkout                | order-service                   | `DEL cart:{userId}` trong Redis khi tạo đơn thành công                                    |
| CRUD sản phẩm (Admin)                | product-service                 | Full CRUD + cache invalidation, ẩn/xóa có điều kiện                                       |
| Quản lý tài khoản (Admin)            | user-service                    | Xem, cập nhật, khoá/mở khoá, xóa có điều kiện                                             |
| Quản lý đơn hàng (Admin)             | order-service                   | Danh sách tất cả đơn, chi tiết, cập nhật trạng thái                                       |
| Validation client + server           | Tất cả                          | Validation UI + Bean Validation                                                           |
| **Spring Security** _(cộng điểm)_    | product, order, user            | JWT filter                                                                                |
| **WebSocket realtime** _(cộng điểm)_ | order-service                   | Thông báo đơn hàng mới cho admin                                                          |
| **ReactJS frontend** _(cộng điểm)_   | User Interface                  | Tách riêng, gọi REST API                                                                  |

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

## 6. Docker Compose — 7 images + AWS RDS MySQL (external)

Bien moi truong dung chung cho AWS RDS MySQL (khuyen nghi dat trong file .env o root):

```env
RDS_HOST=your-rds-endpoint.ap-southeast-1.rds.amazonaws.com
RDS_PORT=3306
RDS_USER=admin
RDS_PASSWORD=your_rds_password
RDS_SSL=true
```

Moi service su dung schema rieng: authdb, userdb, productdb, orderdb, paymentdb.

| Container       | Image/Build              | Port | Runtime     |
| --------------- | ------------------------ | ---- | ----------- |
| api-gateway     | build: ./api-gateway     | 8080 | Node.js     |
| auth-service    | build: ./auth-service    | 3001 | Node.js     |
| user-service    | build: ./user-service    | 3002 | Spring Boot |
| product-service | build: ./product-service | 3003 | Spring Boot |
| order-service   | build: ./order-service   | 3004 | Spring Boot |
| payment-service | build: ./payment-service | 3005 | Spring Boot |
| redis-cache     | redis:7-alpine           | 6379 | Redis       |

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
    depends_on: [redis-cache]
    networks: [app-network]
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - DB_HOST=${RDS_HOST}
      - DB_PORT=3306
      - DB_NAME=authdb
      - DB_USER=${RDS_USER}
      - DB_PASSWORD=${RDS_PASSWORD}
      - DB_SSL=${RDS_SSL}
      - REDIS_HOST=redis-cache
      - SMTP_HOST=smtp.gmail.com
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}

  user-service:
    build: ./user-service
    ports: ["3002:3002"]
    networks: [app-network]
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://${RDS_HOST}:${RDS_PORT}/userdb?useSSL=${RDS_SSL}&requireSSL=${RDS_SSL}
      - SPRING_DATASOURCE_USERNAME=${RDS_USER}
      - SPRING_DATASOURCE_PASSWORD=${RDS_PASSWORD}

  product-service:
    build: ./product-service
    ports: ["3003:3003"]
    depends_on: [redis-cache]
    networks: [app-network]
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://${RDS_HOST}:${RDS_PORT}/productdb?useSSL=${RDS_SSL}&requireSSL=${RDS_SSL}
      - SPRING_DATASOURCE_USERNAME=${RDS_USER}
      - SPRING_DATASOURCE_PASSWORD=${RDS_PASSWORD}
      - SPRING_REDIS_HOST=redis-cache

  order-service:
    build: ./order-service
    ports: ["3004:3004"]
    depends_on: [redis-cache]
    networks: [app-network]
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://${RDS_HOST}:${RDS_PORT}/orderdb?useSSL=${RDS_SSL}&requireSSL=${RDS_SSL}
      - SPRING_DATASOURCE_USERNAME=${RDS_USER}
      - SPRING_DATASOURCE_PASSWORD=${RDS_PASSWORD}
      - PAYMENT_SERVICE_URL=http://payment-service:3005
      - PRODUCT_SERVICE_URL=http://product-service:3003

  payment-service:
    build: ./payment-service
    ports: ["3005:3005"]
    networks: [app-network]
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://${RDS_HOST}:${RDS_PORT}/paymentdb?useSSL=${RDS_SSL}&requireSSL=${RDS_SSL}
      - SPRING_DATASOURCE_USERNAME=${RDS_USER}
      - SPRING_DATASOURCE_PASSWORD=${RDS_PASSWORD}

  redis-cache:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
    command: redis-server --appendonly yes
    networks: [app-network]

volumes:
  redis_data:

networks:
  app-network:
    driver: bridge
```

---

## 7. Thứ tự implement theo tuần (gợi ý)

| Tuần       | Công việc                                                                                                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tuần 1** | ERD + Use Case + System Diagram. Dựng MySQL schema. Setup Gitlab repo, phân chia nhánh                                                                                                                                            |
| **Tuần 2** | auth-service (Node.js): đăng ký OTP, đăng nhập JWT. product-service (Spring Boot): CRUD sản phẩm + REST API                                                                                                                       |
| **Tuần 3** | user-service + order-service (Spring Boot): guest cart theo Session key, lưu cart Redis, tạo đơn, thanh toán mock, lưu đơn MySQL, email notify, xóa cart sau khi đặt hàng thành công. api-gateway (Node.js): routing + JWT verify |
| **Tuần 4** | payment-service. Docker + Docker Compose. Gitlab CI/CD. Deploy online. ReactJS UI. Chat AI                                                                                                                                        |

---

## 8. Lưu ý quan trọng

> ⚠️ **Spring Boot services dùng Java 21** theo yêu cầu đồ án. Không dùng Stored Procedure, Trigger, Check Constraint trong CSDL — chỉ validate trong Service layer.

> ⚠️ **Session chỉ dùng để định danh guest cart** (order-service). Dữ liệu cart thực tế lưu trong Redis. Các service khác dùng JWT stateless, không lưu session.

> ✅ **Rule checkout**: Guest chỉ thao tác xem sản phẩm/giỏ hàng. Muốn `POST /orders` thì bắt buộc đăng nhập/đăng ký để trở thành Customer. Sau khi đặt hàng thành công, order-service xóa cart trong Redis (`DEL cart:{userId}`).

> ✅ **Node.js chỉ dùng cho 2 service**: api-gateway (routing/proxy) và auth-service (OTP SMTP + JWT). Cả hai đều không có yêu cầu JPA hay Spring MVC nên không vi phạm tinh thần đồ án.

> 💡 **Điểm cộng**: WebSocket realtime (+4đ) implement ở order-service Spring Boot bằng `spring-boot-starter-websocket`. ReactJS frontend (+3đ) gọi REST API qua api-gateway port 8080.
