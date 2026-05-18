# Payment Service

`payment-service` quan ly giao dich thanh toan cho don hang, hien ho tro 2 phuong thuc:

- `MOMO`: tao link thanh toan qua MoMo sandbox theo mau `CollectionLink.js`.
- `COD`: tao payment thu tien khi nhan hang, khong goi cong thanh toan.

## Database

Service dung bang `payment`:

```sql
CREATE TABLE payment (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  payment_method VARCHAR(40) NOT NULL,
  provider VARCHAR(80) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(40) NOT NULL,
  transaction_code VARCHAR(120),
  gateway_transaction_id VARCHAR(120),
  payment_url VARCHAR(1000),
  paid_at TIMESTAMP NULL,
  expired_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Environment

```env
PORT=3005
RDS_HOST=your-rds-endpoint
RDS_PORT=3306
RDS_DB=ecommerce_data
RDS_USER=admin
RDS_PASSWORD=your_password
RDS_SSL=false

MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_REDIRECT_URL=http://localhost:5173/customer/orders
MOMO_IPN_URL=http://localhost:3005/payments/webhook/momo
```

## API

### Tao payment

```http
POST /payments
Content-Type: application/json

{
  "orderId": 1001,
  "paymentMethod": "MOMO",
  "amount": 50000,
  "orderInfo": "Thanh toan don hang #1001"
}
```

Voi `MOMO`, response co `paymentUrl` de frontend redirect user sang cong thanh toan.

Voi `COD`, gui:

```json
{
  "orderId": 1001,
  "paymentMethod": "COD",
  "amount": 50000
}
```

### Lay danh sach payment

```http
GET /payments
GET /payments?orderId=1001
GET /payments/{id}
```

### Xac nhan COD da thu tien

```http
PATCH /payments/{id}/cod-paid
```

### Webhook MoMo

```http
POST /payments/webhook/momo
```

Webhook se verify chu ky HMAC SHA256 va cap nhat payment sang `PAID` neu `resultCode = 0`, nguoc lai sang `FAILED`.

## Run

```bash
mvn test
mvn spring-boot:run
```

Hoac Docker:

```bash
docker build -t payment-service .
docker compose up -d --build
```
