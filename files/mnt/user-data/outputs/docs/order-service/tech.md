# Order Service — Tech Stack

## Ngôn ngữ & Runtime

**Spring Boot (Java 21)** — Lý do chọn:

- Orchestrator pattern cần transaction rõ ràng và bù trừ khi bước thanh toán thất bại
- Giỏ hàng theo session và luồng đặt hàng nhiều bước phù hợp với Spring MVC + JPA
- Dễ tích hợp WebSocket, email notify và scheduling theo đúng yêu cầu đồ án

## Framework & Thư viện

| Thư viện                           | Mục đích                                     |
| ---------------------------------- | -------------------------------------------- |
| **spring-boot-starter-web**        | HTTP server, REST API                        |
| **spring-boot-starter-data-jpa**   | Lưu đơn hàng vào MySQL                       |
| **spring-boot-starter-data-redis** | Cache giỏ hàng (cart)                        |
| **spring-boot-starter-amqp**       | [NEW] RabbitMQ Message Broker (Event-Driven) |
| **spring-rabbit**                  | [NEW] Spring AMQP RabbitMQ templates         |
| **spring-boot-starter-mail**       | Gửi email xác nhận                           |
| **spring-boot-starter-websocket**  | Thông báo realtime cho admin                 |
| **spring-boot-starter-validation** | Validate request body                        |
| **spring-boot-starter-security**   | JWT filter / bảo vệ route                    |
| **mysql-connector-j**              | MySQL client                                 |
| **spring-retry**                   | Retry logic cho message handlers             |
| **lombok**                         | Giảm boilerplate                             |

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

## Message Broker — RabbitMQ Configuration

```java
// OrderServiceConfig.java
@Configuration
public class RabbitConfig {

    // Exchanges
    @Bean
    public TopicExchange orderExchange() {
        return new TopicExchange("order.events", true, false);
    }

    // Queues
    @Bean
    public Queue inventoryQueue() { return new Queue("inventory.reserve", true); }

    @Bean
    public Queue paymentQueue() { return new Queue("payment.process", true); }

    @Bean
    public Queue notificationQueue() { return new Queue("notification.send", true); }

    @Bean
    public Queue compensatingQueue() { return new Queue("saga.compensating", true); }

    // Bindings
    @Bean
    public Binding inventoryBinding(Queue inventoryQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(inventoryQueue)
            .to(orderExchange)
            .with("order.created");
    }

    @Bean
    public Binding paymentBinding(Queue paymentQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(paymentQueue)
            .to(orderExchange)
            .with("inventory.reserved");
    }
}
```

## Event-Driven Orchestrator (Mediator Topology)

```java
// OrchestratorService.java - Publish events to Message Queue
@Service
@RequiredArgsConstructor
public class OrchestratorService {

    private final OrderRepository orderRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public void createOrderOrchestrator(Long userId, List<CartItem> cartItems) {

        // Step 1: Save order in PENDING status
        Order order = new Order();
        order.setUserId(userId);
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(cartItems.stream()
            .mapToDouble(item -> item.getPrice() * item.getQuantity())
            .sum());

        order = orderRepository.save(order);

        // Step 2: Publish OrderCreated event to Message Queue (async)
        OrderCreatedEvent event = OrderCreatedEvent.builder()
            .orderId(order.getId())
            .userId(userId)
            .cartItems(cartItems)
            .totalAmount(order.getTotalAmount())
            .timestamp(LocalDateTime.now())
            .correlationId(UUID.randomUUID().toString())
            .build();

        try {
            String eventJson = objectMapper.writeValueAsString(event);
            rabbitTemplate.convertAndSend("order.events", "order.created", eventJson);
            logger.info("OrderCreated event published: orderId={}", order.getId());
        } catch (JsonProcessingException e) {
            logger.error("Failed to publish event", e);
            throw new RuntimeException("Event publish failed");
        }

        // Step 3: Return immediately (202 Accepted)
        // Workflow continues async in event handlers
    }
}

// InventoryEventHandler.java - Listen to OrderCreated event
@Service
@RequiredArgsConstructor
public class InventoryEventHandler {

    private final RestTemplate restTemplate;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "inventory.reserve")
    @Transactional
    public void handleOrderCreated(String message) {
        OrderCreatedEvent event = objectMapper.readValue(message, OrderCreatedEvent.class);

        try {
            // Call product-service to reserve inventory
            boolean inventoryOk = productServiceClient.checkAndReserveInventory(
                event.getCartItems(),
                event.getCorrelationId()
            );

            if (inventoryOk) {
                // Publish InventoryReserved event
                rabbitTemplate.convertAndSend(
                    "order.events",
                    "inventory.reserved",
                    objectMapper.writeValueAsString(InventoryReservedEvent.of(event))
                );
                logger.info("InventoryReserved: orderId={}", event.getOrderId());
            } else {
                // Publish InventoryFailed event (Compensating Transaction)
                rabbitTemplate.convertAndSend(
                    "order.events",
                    "saga.compensating",
                    objectMapper.writeValueAsString(InventoryFailedEvent.of(event))
                );
                logger.warn("Inventory failed: orderId={}", event.getOrderId());
            }
        } catch (Exception e) {
            logger.error("Inventory handler error", e);
            rabbitTemplate.convertAndSend("order.events", "saga.compensating", message);
        }
    }
}

// PaymentEventHandler.java - Listen to InventoryReserved event
@Service
@RequiredArgsConstructor
public class PaymentEventHandler {

    private final RestTemplate restTemplate;
    private final RabbitTemplate rabbitTemplate;
    private final OrderRepository orderRepository;

    @RabbitListener(queues = "payment.process")
    @Transactional
    public void handleInventoryReserved(String message) {
        InventoryReservedEvent event = objectMapper.readValue(message, InventoryReservedEvent.class);

        try {
            // Call payment-service
            PaymentResult paymentResult = paymentServiceClient.process(event.getOrderId());

            if (paymentResult.isSuccess()) {
                // Publish PaymentProcessed event
                rabbitTemplate.convertAndSend(
                    "order.events",
                    "payment.processed",
                    objectMapper.writeValueAsString(PaymentProcessedEvent.of(event, paymentResult))
                );
            } else {
                // Payment failed → Compensating Transaction
                rabbitTemplate.convertAndSend(
                    "order.events",
                    "saga.compensating",
                    objectMapper.writeValueAsString(PaymentFailedEvent.of(event))
                );
            }
        } catch (Exception e) {
            logger.error("Payment handler error", e);
            rabbitTemplate.convertAndSend("order.events", "saga.compensating", message);
        }
    }
}

// CompensatingTransactionHandler.java - Rollback logic
@Service
@RequiredArgsConstructor
public class CompensatingTransactionHandler {

    private final OrderRepository orderRepository;
    private final RestTemplate restTemplate;

    @RabbitListener(queues = "saga.compensating")
    @Transactional
    public void handleCompensation(String message) {

        try {
            // Parse event (could be InventoryFailed, PaymentFailed, etc.)
            BaseEvent event = objectMapper.readValue(message, BaseEvent.class);
            Long orderId = event.getOrderId();

            // Step 1: Cancel order in database
            Order order = orderRepository.findById(orderId).orElseThrow();
            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);

            // Step 2: Refund inventory if needed
            productServiceClient.refundInventory(order.getOrderItems(), event.getCorrelationId());

            // Step 3: Publish OrderCancelled event
            logger.info("Order compensated: orderId={}", orderId);

        } catch (Exception e) {
            logger.error("Compensation failed - requires manual intervention", e);
            // TODO: Alert admin
        }
    }
}
```

## Biến môi trường

```env
# Server
PORT=3004

# Database
SPRING_DATASOURCE_URL=jdbc:mysql://your-rds-endpoint.ap-southeast-1.rds.amazonaws.com:3306/orderdb?useSSL=true&requireSSL=true
SPRING_DATASOURCE_USERNAME=admin
SPRING_DATASOURCE_PASSWORD=your_rds_password

# Redis (Cache)
SPRING_REDIS_HOST=redis-cache
SPRING_REDIS_PORT=6379

# RabbitMQ (Message Broker) [NEW]
SPRING_RABBITMQ_HOST=rabbitmq
SPRING_RABBITMQ_PORT=5672
SPRING_RABBITMQ_USERNAME=guest
SPRING_RABBITMQ_PASSWORD=guest
SPRING_RABBITMQ_VIRTUAL_HOST=/

# Service URLs
PRODUCT_SERVICE_URL=http://product-service:3003
PAYMENT_SERVICE_URL=http://payment-service:3005

# External APIs
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
