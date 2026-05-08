# Order Service — Tech Stack

## Ngôn ngữ & Runtime

**Spring Boot (Java 21)** — Lý do chọn:

- Orchestrator pattern cần transaction rõ ràng và bù trừ khi bước thanh toán thất bại
- Giỏ hàng theo session và luồng đặt hàng nhiều bước phù hợp với Spring MVC + JPA
- Dễ tích hợp WebSocket, email notify và scheduling theo đúng yêu cầu đồ án

## Framework & Thư viện

| Thư viện                           | Mục đích                                   |
| ---------------------------------- | ------------------------------------------ |
| **spring-boot-starter-web**        | HTTP server, REST API                      |
| **spring-boot-starter-data-jpa**   | Lưu đơn hàng vào MySQL                     |
| **spring-boot-starter-data-redis** | Cache giỏ hàng (cart)                      |
| **spring-boot-starter-mail**       | Gửi email xác nhận                         |
| **spring-boot-starter-websocket**  | Thông báo realtime cho admin               |
| **spring-boot-starter-validation** | Validate request body                      |
| **spring-boot-starter-security**   | JWT filter / bảo vệ route                  |
| **mysql-connector-j**              | MySQL client                               |
| **spring-retry**                   | Retry gọi product-service, payment-service |
| **lombok**                         | Giảm boilerplate                           |

## Retry Logic (Tiêu chí #6)

```java
@Retryable(
    retryFor = {Exception.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 1000, multiplier = 2)
)
public PaymentResult processPayment(Order order) {
    // Gọi payment-service, nếu payment-service restart thì retry tự động
    return paymentClient.charge(order);
}
```

**Kịch bản test**: Restart payment-service → order-service tự retry 3 lần, sau đó trả lỗi rõ ràng cho user thay vì crash.

## Rate Limiter (Tiêu chí #7)

```java
// Giới hạn tạo đơn hàng: 5 lần/phút/IP
@Bean
public FilterRegistrationBean<OncePerRequestFilter> orderLimiter() {
    // Có thể dùng Bucket4j hoặc custom servlet filter
    return new FilterRegistrationBean<>();
}
```

## Redis — Cache Giỏ hàng

```java
// Cart CRUD trong RedisTemplate
// Key: cart:{userId}
// Value: JSON array of { productId, quantity, price }

redisTemplate.opsForValue().set("cart:" + userId, cartJson, Duration.ofDays(1));
String cartJson = redisTemplate.opsForValue().get("cart:" + userId);
redisTemplate.delete("cart:" + userId);
```

## Orchestrator Flow

```java
public Order createOrderOrchestrator(Long userId, List<CartItem> cartItems) {
    // Step 1: Check & reserve inventory (product-service)
    boolean inventoryOk = productClient.checkInventory(cartItems);
    if (!inventoryOk) throw new IllegalStateException("Out of stock");

    // Step 2: Create order record
    Order order = orderRepository.save(...);

    // Step 3: Process payment (payment-service)
    PaymentResult payment = paymentClient.process(order);
    if (!payment.isSuccess()) {
        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
        throw new IllegalStateException("Payment failed");
    }

    // Step 4: Send notification (fire and forget)
    notificationService.sendOrderMail(userId, order);
    return order;
}
```

## Biến môi trường

```env
PORT=3004
SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/orderdb
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password
SPRING_REDIS_HOST=redis-cache
SPRING_REDIS_PORT=6379
PRODUCT_SERVICE_URL=http://product-service:3003
PAYMENT_SERVICE_URL=http://payment-service:3005
NOTIFICATION_EMAIL_URL=https://api.emailprovider.com
```

## Docker

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/order-service-*.jar app.jar
EXPOSE 3004
ENTRYPOINT ["java", "-jar", "app.jar"]
```
