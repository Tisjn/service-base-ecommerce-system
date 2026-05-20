# Payment Service — Product & Workflow

## Mô tả sản phẩm

**Payment Service** quản lý thanh toán cho hệ thống với hỗ trợ:

- **MoMo Sandbox** — Sandbox payment gateway
- **COD (Cash on Delivery)** — Thanh toán khi nhận hàng
- **Webhook verification** — HMAC-SHA256 signature

### Quy tắc nghiệp vụ

| Chức năng          | MOMO | COD |
| ------------------ | ---- | --- |
| Tạo payment        | ✅   | ✅  |
| Tạo payment URL    | ✅   | ❌  |
| Webhook callback   | ✅   | ❌  |
| Admin mark as paid | ❌   | ✅  |

## Workflow 1: MOMO Payment

```
OrderService calls PaymentService.createPayment()
    │
    ▼
POST /payments
    ├── orderId: 12345
    ├── paymentMethod: "MOMO"
    └── amount: 2400000
    │
    ▼
PaymentService.createPayment()
    │
    ├─→ Create payment record in MySQL
    │   ├── status = "PENDING"
    │   ├── paymentUrl = null (yet)
    │   └── saved as Payment
    │
    ├─→ Call MoMoService.createPaymentLink()
    │   ├── Build HMAC-SHA256 signed request
    │   ├── POST to MoMo API
    │   ├── MoMo returns: { payUrl, requestId, ... }
    │   └── Save payUrl to payment record
    │
    ▼
Response to OrderService: { id, paymentUrl, ... }
    │
    ▼
OrderService returns to frontend
    │
    ▼
Frontend redirects user to paymentUrl
    │
    ▼
Customer enters MoMo credentials on MoMo page
    │
    ▼
Payment completed on MoMo server
    │
    ▼
MoMo calls webhook: POST /payments/webhook/momo
    ├── Body: HMAC-SHA256 signed JSON
    │   {
    │     "requestId": "req_123",
    │     "amount": 2400000,
    │     "transId": "momo_txn_abc",
    │     "resultCode": 0 (success)
    │     "signature": "..." (HMAC hash)
    │   }
    │
    ▼
WebhookController.handleMoMoCallback()
    │
    ├─→ Verify signature: MessageDigest.isEqual(provided, computed)
    │
    ├─→ If resultCode = 0
    │   ├── Update payment status = "PAID"
    │   ├── Save transId
    │   └── Set paid_at timestamp
    │
    └─→ Response to MoMo: 200 OK

    ▼
Frontend can check payment status on order detail page
```

## Workflow 2: COD Payment

```
Customer selects COD at checkout
    │
    ▼
OrderService calls PaymentService.createPayment()
    │
    ▼
POST /payments
    ├── orderId: 12346
    ├── paymentMethod: "COD"
    └── amount: 1500000
    │
    ▼
PaymentService.createPayment()
    │
    ├─→ Create payment record in MySQL
    │   ├── status = "PENDING"
    │   ├── paymentUrl = null
    │   └── payment_method = "COD"
    │
    ▼
Response: { id: "pay_cod123", status: "PENDING" }
    │
    ▼
Order status = PENDING (waiting for payment)
    │
    ▼
Goods shipped to customer
    │
    ▼
Admin dashboard → /admin/orders
    │
    ▼
Click order → "Mark COD as Paid"
    │
    ▼
PATCH /payments/{id}/cod-paid
    ├── Header: X-User-Role: ADMIN

    ▼
PaymentService.markCODPaid()
    │
    ├─→ Find payment by id
    ├─→ Update status = "PAID"
    ├─→ Set paid_at = now()
    └─→ Save to MySQL

    ▼
Response: { id, status: "PAID", paid_at: "..." }
    │
    ▼
Order status can now be updated to "DELIVERED"
```

## Webhook Verification (Security)

```
MoMo sends webhook with HMAC signature
    │
    ▼
HmacSignatureUtil.verifySignature()
    │
    ├─→ Extract signature from webhook body
    │   ├── Provided: "abc123def456..."
    │
    ├─→ Recompute signature using secret key
    │   ├── Data: "accessKey=...&amount=...&...&secretKey=..."
    │   ├── Algorithm: HMAC-SHA256
    │   └── Computed: "abc123def456..."
    │
    ├─→ Compare:
    │   ├── Match? → Webhook is valid (from MoMo)
    │   └── Mismatch? → Reject (potential fraud)
    │
    ▼
If valid: Update payment status
If invalid: Log security event + reject
```

## API Response Examples

### Create Payment (MOMO)

```json
{
  "id": "pay_12345",
  "orderId": 12345,
  "paymentMethod": "MOMO",
  "amount": 2400000,
  "status": "PENDING",
  "paymentUrl": "https://test-payment.momo.vn/gw_api/checkoutweb?token=...",
  "createdAt": "2026-05-20T15:30:00Z"
}
```

### Create Payment (COD)

```json
{
  "id": "pay_12346",
  "orderId": 12346,
  "paymentMethod": "COD",
  "amount": 1500000,
  "status": "PENDING",
  "paymentUrl": null,
  "createdAt": "2026-05-20T15:35:00Z"
}
```

### Payment Webhook Callback (from MoMo)

```
POST /payments/webhook/momo (from MoMo servers)

Body (HMAC-SHA256 signed):
{
  "partnerCode": "MOMO",
  "orderId": 12345,
  "requestId": "req_123",
  "amount": 2400000,
  "transId": "momo_txn_abc123",
  "resultCode": 0,
  "resultMessage": "Successful",
  "signature": "7d83c31e6a4e1c7b..."
}

Response: 200 OK
{
  "success": true,
  "message": "Payment recorded"
}
```

### Mark COD as Paid (Admin)

```
PATCH /payments/pay_12346/cod-paid

Response: 200 OK
{
  "id": "pay_12346",
  "status": "PAID",
  "paidAt": "2026-05-20T16:00:00Z"
}
```

---
