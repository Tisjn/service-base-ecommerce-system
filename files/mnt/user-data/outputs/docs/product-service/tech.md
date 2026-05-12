# Product Service — Tech Stack

## Ngôn ngữ & Runtime

**Spring Boot (Java 21)** — Lý do chọn:

- Service đọc nhiều dữ liệu, cache Redis phù hợp với Spring Cache và Spring Data Redis
- CRUD sản phẩm + entity mapping rõ ràng, đúng mô hình JPA
- Dễ tích hợp validation, security và REST API theo kiến trúc tổng thể

## Framework & Thư viện

| Thư viện                           | Mục đích                    |
| ---------------------------------- | --------------------------- |
| **spring-boot-starter-web**        | REST API, MVC               |
| **spring-boot-starter-data-jpa**   | MySQL persistence layer     |
| **spring-boot-starter-data-redis** | Redis cache client          |
| **spring-boot-starter-validation** | Validate request body       |
| **spring-boot-starter-security**   | JWT filter / bảo vệ route   |
| **mysql-connector-j**              | MySQL client                |
| **spring-retry**                   | Retry gọi internal services |
| **lombok**                         | Giảm boilerplate            |

## Redis Cache Strategy

**Pattern: Cache-Aside (Lazy Loading)**

```java
public ProductDto getProductById(Long id) {
    String cacheKey = "product:" + id;
    ProductDto cached = redisTemplate.opsForValue().get(cacheKey);
    if (cached != null) return cached;

    Product product = productRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("Product not found"));

    ProductDto dto = productMapper.toDto(product);
    redisTemplate.opsForValue().set(cacheKey, dto, Duration.ofMinutes(10));
    return dto;
}

public void updateProduct(Long id, UpdateProductRequest request) {
    productRepository.save(...);
    redisTemplate.delete("product:" + id);
}
```

## Rate Limiter (Tiêu chí #7)

```java
// Có thể dùng Bucket4j hoặc custom servlet filter cho route write của admin
@Bean
public FilterRegistrationBean<OncePerRequestFilter> rateLimitFilter() {
    return new FilterRegistrationBean<>();
}
```

## Retry khi gọi external (Tiêu chí #6)

```java
@Retryable(
    retryFor = {Exception.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 1000, multiplier = 2)
)
public void syncProductState() {
    // Khi order-service gọi lại product-service sau restart
}
```

## Biến môi trường

```env
PORT=3003
SPRING_DATASOURCE_URL=jdbc:mysql://your-rds-endpoint.ap-southeast-1.rds.amazonaws.com:3306/productdb?useSSL=true&requireSSL=true
SPRING_DATASOURCE_USERNAME=admin
SPRING_DATASOURCE_PASSWORD=your_rds_password
SPRING_REDIS_HOST=redis-cache
SPRING_REDIS_PORT=6379
```

## Docker

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/product-service-*.jar app.jar
EXPOSE 3003
ENTRYPOINT ["java", "-jar", "app.jar"]
```
