# User Service — Tech Stack

## Ngôn ngữ & Runtime

**Spring Boot (Java 21)** — Lý do chọn:

- Service quản lý profile có CRUD rõ ràng, phù hợp mô hình Controller–Service–Repository
- Tích hợp tốt với MySQL qua Spring Data JPA và Bean Validation
- Dễ đồng bộ với auth-service thông qua REST API và JWT filter ở tầng gateway

## Framework & Thư viện

| Thư viện                           | Mục đích                                      |
| ---------------------------------- | --------------------------------------------- |
| **spring-boot-starter-web**        | REST API, MVC, controller                     |
| **spring-boot-starter-data-jpa**   | Persistence layer, repository, entity mapping |
| **spring-boot-starter-validation** | Validate request body                         |
| **spring-boot-starter-security**   | JWT filter, bảo vệ route                      |
| **mysql-connector-j**              | MySQL client                                  |
| **spring-retry**                   | Retry gọi service khác                        |
| **spring-boot-starter-webflux**    | Gọi internal API bằng WebClient (nếu dùng)    |
| **lombok**                         | Giảm boilerplate                              |

## Cơ chế Retry (Tiêu chí #6)

Khi user-service gọi order-service để lấy lịch sử đơn hàng, dùng **Spring Retry**:

```java
@Retryable(
    retryFor = {Exception.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 1000, multiplier = 2)
)
public List<OrderDto> getOrdersByUser(Long userId) {
    return orderClient.getOrdersByUser(userId);
}
```

Kết quả: Nếu order-service restart, user-service tự retry sau 1s, 2s, 4s → thỏa tiêu chí "Calls can be made after restarting the service".

## Rate Limiter (Tiêu chí #7)

```java
// Có thể dùng Bucket4j hoặc custom servlet filter cho route nhạy cảm
@Bean
public FilterRegistrationBean<OncePerRequestFilter> rateLimitFilter() {
    return new FilterRegistrationBean<>();
}
```

## Biến môi trường

```env
PORT=3002
SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/userdb
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password
ORDER_SERVICE_URL=http://order-service:3004
```

## Docker

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/user-service-*.jar app.jar
EXPOSE 3002
ENTRYPOINT ["java", "-jar", "app.jar"]
```
