# Order Service — Product & Workflow

## Mô tả sản phẩm

**Order Service** là "orchestrator" chính của hệ thống, điều phối:

- Guest cart management (Session → Redis)
- Order creation & payment coordination
- Real-time order tracking via WebSocket
- Event-driven notifications

### Quy tắc nghiệp vụ

| Chức năng           | Guest | Customer | Admin |
| ------------------- | ----- | -------- | ----- |
| Xem giỏ             | ✅    | ✅       | ❌    |
| Thêm/sửa/xóa cart   | ✅    | ✅       | ❌    |
| Merge cart          | ❌    | ✅       | ❌    |
| Tạo đơn             | ❌    | ✅       | ❌    |
| Xem đơn của mình    | ❌    | ✅       | ❌    |
| Xem tất cả đơn      | ❌    | ❌       | ✅    |
| Cập nhật trạng thái | ❌    | ❌       | ✅    |

## Workflow 1: Guest Add to Cart

```
Guest xem sản phẩm
    │
    ▼
Click "Add to Cart"
    │
    ▼
POST /cart/items
    + No auth (HttpSession embedded in cookie)
    + Body: { productId: 1, quantity: 2 }
    │
    ▼
OrderController.addToCart()
    ├── HttpSession.getId() → "abc123xyz"
    ├── cartKey = "guest:abc123xyz"
    └── Forward to CartService
    │
    ▼
CartService.addToCart()
    │
    ├─→ Get item from product-service (verify price/stock)
    ├─→ Add to cart
    ├─→ Save to Redis
    │   ├── Key: cart:guest:abc123xyz
    │   ├── TTL: 24 hours
    │   └── Value: JSON cart
    │
    ▼
Response: { userId: "guest:abc123xyz", items: [...], total: 2400 }
    │
    ▼
Frontend stores guestToken = "guest:abc123xyz"
    │
    ▼
Guest can continue shopping or checkout
```

## Workflow 2: Guest → Customer → Merge Cart

```
Guest decided to checkout
    │
    ▼
Click "Proceed to Checkout" → Redirect to login
    │
    ▼
Customer registers/logs in via auth-service
    │
    ▼
Frontend receives JWT token + userId
    │
    ▼
Frontend calls POST /cart/{userId}/merge
    ├── Header: Authorization: Bearer <JWT>
    ├── Body: { guestToken: "guest:abc123xyz" }
    └── Resolved userId: "usr_12345"
    │
    ▼
API Gateway verifies JWT → sets X-User-Id: usr_12345
    │
    ▼
OrderController.mergeCart()
    │
    ▼
CartService.mergeGuestCart()
    │
    ├─→ Get guest cart from Redis
    │   ├── Key: cart:guest:abc123xyz
    │   ├── Items: [{ productId: 1, qty: 2 }]
    │
    ├─→ Get user cart from Redis (if exists)
    │   ├── Key: cart:usr_12345
    │   └── Items: [{ productId: 3, qty: 1 }]
    │
    ├─→ Merge items
    │   └── Combined: [{ id: 1, qty: 2 }, { id: 3, qty: 1 }]
    │
    ├─→ Save merged cart to Redis
    │   ├── Key: cart:usr_12345
    │   └── TTL: 24 hours
    │
    ├─→ Delete guest cart
    │   └── DEL cart:guest:abc123xyz
    │
    └─→ Response: { success: true, items: [...] }
    │
    ▼
Frontend updates UI
    │
    ▼
Customer ready to checkout
```

## Workflow 3: Customer Create Order (Orchestration)

```
Customer click "Place Order"
    │
    ▼
POST /api/orders
    + Header: Authorization: Bearer <JWT>
    + Body: {
        "shippingAddress": "123 Main St, HCM",
        "paymentMethod": "MOMO"
      }
    │
    ▼
OrderController.createOrder(userId)
    │
    ▼
OrderService.createOrder() — ORCHESTRATION STARTS
    │
    ├─→ STEP 1: Create pending order in MySQL
    │   ├── INSERT orders (status=PENDING, createdAt=now)
    │   ├── INSERT order_items (from cart)
    │   └── savedOrder.id = "ord_12345"
    │
    ├─→ STEP 2: Call ProductService.reserveInventory()
    │   ├── POST /api/inventory/reserve
    │   ├── Request: { items: [{productId: 1, qty: 2}] }
    │   ├── Response: { success: true } or { success: false }
    │   │
    │   ├── If success: continue
    │   └── If fail: rollback order, return 400 "Out of stock"
    │
    ├─→ STEP 3: Call PaymentService.createPayment()
    │   ├── POST /payments
    │   ├── Request: { orderId, amount, paymentMethod }
    │   │
    │   ├── If MOMO: return paymentUrl
    │   └── If COD: return payment_id
    │
    ├─→ STEP 4: Publish RabbitMQ event (async)
    │   ├── Topic: order-exchange
    │   ├── Event: order.created
    │   ├── Subscribers: email-service, notification-service
    │   └── Send now, don't wait for response
    │
    ├─→ STEP 5: Send WebSocket notification (async)
    │   ├── Message: { event: "order.new", orderId, amount, customer }
    │   ├── To: admin dashboard listeners
    │   └── Non-blocking
    │
    ├─→ STEP 6: Clear cart from Redis
    │   ├── DEL cart:usr_12345
    │   └── (Cart data saved in order_items anyway)
    │
    └─→ STEP 7: Send email confirmation (async)
        ├── Spring Mail (SMTP)
        ├── To: customer email
        ├── Content: Order details + payment link (if MOMO)
        └── Non-blocking

    ▼
Return: 202 Accepted
{
  "orderId": "ord_12345",
  "status": "PENDING",
  "total": 2400.00,
  "items": [...],
  "paymentUrl": "https://test-payment.momo.vn/..." (if MOMO),
  "message": "Please proceed with payment"
}
```

## Workflow 4: WebSocket Real-time Updates

```
Admin logged in + WebSocket connected
    │
    ▼
New order created (Workflow 3, Step 4)
    │
    ▼
RabbitMQ event published
    │
    ▼
OrderWebSocketHandler broadcasts
    │
    ├─→ Message: {
         "event": "order.new",
         "orderId": "ord_12345",
         "customerName": "John Doe",
         "amount": 2400,
         "timestamp": "2026-05-20T15:30:00Z"
       }
    │
    ▼
Admin browser receives message
    │
    ▼
Dashboard UI updates in real-time
    ├── New order appears in list
    ├── Notification sound/popup
    └── Order status updates as needed
```

## API Response Examples

### Create Order (202 Accepted)

```json
{
  "orderId": "ord_12345",
  "status": "PENDING",
  "total": 2400.0,
  "items": [
    {
      "productId": 1,
      "productName": "Laptop",
      "quantity": 2,
      "price": 1200.0
    }
  ],
  "shippingAddress": "123 Main St, HCM",
  "paymentMethod": "MOMO",
  "paymentUrl": "https://test-payment.momo.vn/...",
  "createdAt": "2026-05-20T15:30:00Z"
}
```

### Merge Cart (200 OK)

```json
{
  "success": true,
  "message": "Cart merged successfully",
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "total": 2400.0
    },
    {
      "productId": 3,
      "quantity": 1,
      "total": 500.0
    }
  ],
  "total": 2900.0
}
```

---
