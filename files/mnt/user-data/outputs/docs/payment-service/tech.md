# Payment Service — Tech Stack

## Ngôn ngữ & Runtime

**Spring Boot (Java 21)** — Lý do chọn:

- Service xử lý payment / webhook cần transaction rõ ràng và dễ audit
- Phù hợp với MySQL để lưu transaction records và Spring MVC cho REST API
- Có thể mở rộng với scheduler, retry và secure webhook validation

## Framework & Thư viện

| Thư viện                           | Mục đích                      |
| ---------------------------------- | ----------------------------- |
| **spring-boot-starter-web**        | HTTP server, REST API         |
| **spring-boot-starter-data-jpa**   | Lưu transaction records       |
| **spring-boot-starter-validation** | Validate request body         |
| **spring-boot-starter-security**   | Bảo vệ route nội bộ / webhook |
| **mysql-connector-j**              | MySQL client                  |
| **spring-retry**                   | Retry gọi payment gateway     |
| **lombok**                         | Giảm boilerplate              |

## Mock Payment Gateway

Để demo, implement mock gateway ngay trong service:

```java
public PaymentResult mockCharge(BigDecimal amount, String method) {
    // Giả lập 90% thành công, 10% thất bại
    try {
        Thread.sleep(500);
    } catch (InterruptedException ignored) {}
    boolean success = Math.random() > 0.1;
    return new PaymentResult(
        "mock_" + System.currentTimeMillis(),
        success ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
        amount
    );
}
```

## Biến môi trường

```env
PORT=3005
SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/paymentdb
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password
PAYMENT_GATEWAY_URL=https://mock-gateway.internal
WEBHOOK_SECRET=webhook_hmac_secret
ORDER_SERVICE_URL=http://order-service:3004
```

## Docker

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/payment-service-*.jar app.jar
EXPOSE 3005
ENTRYPOINT ["java", "-jar", "app.jar"]
```
