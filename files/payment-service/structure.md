# Payment Service — Project Structure

**Port:** 3005 | **Framework:** Spring Boot 3.x | **Language:** Java 21

## Cấu trúc thư mục

```
src/
├── main/java/com/example/paymentservice/
│   │
│   ├── controller/
│   │   ├── PaymentController.java
│   │   └── WebhookController.java
│   │
│   ├── service/
│   │   ├── PaymentService.java
│   │   ├── MoMoService.java
│   │   └── PaymentGatewayService.java
│   │
│   ├── repository/
│   │   └── PaymentRepository.java
│   │
│   ├── entity/
│   │   ├── Payment.java
│   │   └── Transaction.java
│   │
│   ├── dto/
│   │   ├── PaymentDTO.java
│   │   ├── MoMoWebhookRequest.java
│   │   └── CreatePaymentRequest.java
│   │
│   ├── util/
│   │   └── HmacSignatureUtil.java    # HMAC-SHA256
│   │
│   ├── exception/
│   │   ├── PaymentGatewayException.java
│   │   └── WebhookVerificationException.java
│   │
│   └── PaymentServiceApplication.java
│
└── resources/
    ├── application.yml
    └── schema.sql
```

## API Endpoints

| Method | Path                      | Auth   | Mô tả                   |
| ------ | ------------------------- | ------ | ----------------------- |
| POST   | `/payments`               | JWT    | Tạo payment             |
| GET    | `/payments`               | JWT    | Danh sách payment       |
| GET    | `/payments/{id}`          | JWT    | Chi tiết payment        |
| PATCH  | `/payments/{id}/cod-paid` | JWT    | Xác nhận COD thanh toán |
| POST   | `/payments/webhook/momo`  | Public | MoMo callback handler   |

## Luồng dữ liệu — Create Payment (MOMO)

```
POST /payments
    + Header: Authorization: Bearer <JWT>
    + Body: {
        "orderId": 12345,
        "paymentMethod": "MOMO",
        "amount": 2400000,
        "orderInfo": "Payment for order #12345"
      }
    │
    ▼
PaymentController.createPayment()
    │
    ▼
PaymentService.createPayment()
    │
    ├─→ Create payment record in MySQL
    │   ├── INSERT payments (status=PENDING)
    │   └── paymentId: "pay_abc123"
    │
    ├─→ If method = "MOMO"
    │   ├─→ Call MoMoService.generatePaymentLink()
    │       ├── Build request to MoMo API
    │       ├── Sign with HMAC-SHA256
    │       └── POST to test-payment.momo.vn/v2/gateway/api/create
    │       │
    │       ├── Response: { paymentUrl, requestId, ... }
    │       └── Save requestId to database
    │
    └─→ Return paymentUrl to frontend

    ▼
Response: {
  "id": "pay_abc123",
  "orderId": 12345,
  "amount": 2400000,
  "status": "PENDING",
  "paymentUrl": "https://test-payment.momo.vn/...",
  "createdAt": "2026-05-20T15:30:00Z"
}
    │
    ▼
Frontend redirects user to paymentUrl
```

## Luồng dữ liệu — MoMo Webhook

```
User completes payment on MoMo
    │
    ▼
MoMo calls webhook: POST /payments/webhook/momo
    ├── Body (HMAC-SHA256 signed)
    │   {
    │     "orderId": 12345,
    │     "requestId": "req_123",
    │     "amount": 2400000,
    │     "transId": "momo_txn_123",
    │     "resultCode": 0,           (0 = success, else = failed)
    │     "signature": "hash_here"
    │   }
    │
    ▼
WebhookController.handleMoMoCallback()
    │
    ├─→ HmacSignatureUtil.verifySignature()
    │   ├── Extract signature from body
    │   ├── Recompute hash with secret key
    │   └── Compare: match? continue : reject
    │
    ├─→ If resultCode = 0 (success)
    │   ├── Update payment status = "PAID"
    │   ├── Save transId, signature
    │   ├── Update paid_at timestamp
    │   └── (Frontend checks payment status after returning from MoMo)
    │
    └─→ If resultCode != 0 (failed)
        ├── Update payment status = "FAILED"
        └── (Customer can retry)

    ▼
Response: { success: true }
```

## Luồng dữ liệu — Create Payment (COD)

```
POST /payments
    + Body: {
        "orderId": 12346,
        "paymentMethod": "COD",
        "amount": 1500000
      }
    │
    ▼
PaymentService.createPayment()
    │
    ├─→ Create payment record in MySQL
    │   ├── INSERT payments
    │   ├── status = "PENDING"
    │   ├── paymentUrl = null
    │   └── paymentId: "pay_cod123"
    │
    ▼
Response: {
  "id": "pay_cod123",
  "orderId": 12346,
  "amount": 1500000,
  "status": "PENDING",
  "paymentMethod": "COD",
  "paymentUrl": null,
  "createdAt": "2026-05-20T15:35:00Z"
}
    │
    ▼
Order status stays PENDING
    │
    ▼
When goods delivered → Admin marks COD as paid
    │
    ├─→ PATCH /payments/{id}/cod-paid
    └─→ Update status = "PAID"
```

---
