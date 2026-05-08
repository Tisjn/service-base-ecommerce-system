# Payment Service — Project Structure

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
│   └── payment.routes.js       # /payments, /payments/:id, /payments/webhook
│
├── controllers/
│   └── payment.controller.js
│
├── services/                   # [Business Layer]
│   ├── payment.service.js      # createPayment, getStatus, refund
│   └── gateway.service.js      # Adapter cho external Payment Gateway / mock
│
├── repositories/               # [Persistence Layer]
│   └── payment.repository.js   # MySQL: transactions table
│
├── middlewares/
│   ├── verifyWebhook.js        # Xác minh HMAC signature từ gateway
│   ├── authHeader.js
│   └── errorHandler.js
│
└── utils/
    ├── hmac.utils.js           # createSignature, verifySignature
    └── logger.js
```

## API Endpoints

| Method | Path                   | Auth           | Mô tả                             |
| ------ | ---------------------- | -------------- | --------------------------------- |
| POST   | `/payments`            | Internal       | Tạo giao dịch (order-service gọi) |
| GET    | `/payments/:id`        | Customer/Admin | Xem chi tiết giao dịch            |
| GET    | `/payments`            | Admin          | Danh sách tất cả giao dịch        |
| POST   | `/payments/webhook`    | External       | Nhận callback từ Payment Gateway  |
| POST   | `/payments/:id/refund` | Admin          | Hoàn tiền                         |

## Database Schema

```sql
-- MySQL: paymentdb
CREATE TABLE transactions (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    amount          DECIMAL(15, 2) NOT NULL,
    method          ENUM('cod','mock_card','bank_transfer'),
    status          ENUM('PENDING','COMPLETED','FAILED','REFUNDED') DEFAULT 'PENDING',
    gateway_tx_id   VARCHAR(255),      -- ID từ payment gateway
    gateway_response JSON,             -- Raw response từ gateway
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Luồng dữ liệu chính

### Tạo giao dịch thanh toán

```text
POST /payments
    │
    ▼
payment.controller.create()
    │
    ▼
payment.service.createPayment()
    ├── payment.repository.insert() → MySQL INSERT
    ├── gateway.service.charge()    → external gateway / mock
    └── payment.repository.update() → cập nhật status / gateway_tx_id
```

### Nhận webhook

```text
POST /payments/webhook
    │
    ▼
verifyWebhook middleware
    │
    ▼
payment.controller.handleWebhook()
    │
    ▼
payment.service.updateFromWebhook()
    ├── verify signature
    ├── update transaction status
    └── notify order-service
```

## Ghi chú kiến trúc

> Payment-service nên giữ logic gateway tách khỏi business logic để dễ thay đổi nhà cung cấp và dễ audit log.
