# Order Service — Tech Stack

**Port:** 3004 | **Language:** Java 21 | **Framework:** Spring Boot 3.x

## Ngôn ngữ & Runtime

**Java 21 + Spring Boot 3.x** — Lý do chọn:

- Spring Cloud Netflix Feign cho HTTP client calls
- Spring AMQP + RabbitMQ cho event-driven architecture
- Spring WebSocket cho real-time updates
- Spring Mail cho email notifications
- Transaction support cho order orchestration

## Framework & Thư viện

| Thư viện               | Mục đích                      |
| ---------------------- | ----------------------------- |
| **Spring Web**         | REST controller               |
| **Spring Data JPA**    | Order entity persistence      |
| **Spring Data Redis**  | Cart storage                  |
| **Spring Cloud Feign** | HTTP client to other services |
| **Spring AMQP**        | RabbitMQ message publishing   |
| **Spring WebSocket**   | Real-time notifications       |
| **Spring Mail**        | SMTP email sending            |
| **Spring Session**     | Session management            |
| **MySQL Connector**    | Database driver               |

## Cấu hình RabbitMQ

```yaml
spring:
  rabbitmq:
    host: rabbitmq
    port: 5672
    username: guest
    password: guest
    virtual-host: /
```

## RabbitMQ Events Configuration

```java
@Configuration
public class RabbitMQConfig {

    // Exchange
    @Bean
    public TopicExchange orderExchange() {
        return new TopicExchange("order-exchange", true, false);
    }

    // Queues
    @Bean
    public Queue orderCreatedQueue() {
        return new Queue("order.created.queue", true);
    }

    @Bean
    public Queue orderCancelledQueue() {
        return new Queue("order.cancelled.queue", true);
    }

    // Bindings
    @Bean
    public Binding bindingCreated(Queue orderCreatedQueue,
                                  TopicExchange orderExchange) {
        return BindingBuilder.bind(orderCreatedQueue)
            .to(orderExchange)
            .with("order.created");
    }

    @Bean
    public Binding bindingCancelled(Queue orderCancelledQueue,
                                    TopicExchange orderExchange) {
        return BindingBuilder.bind(orderCancelledQueue)
            .to(orderExchange)
            .with("order.cancelled");
    }
}
```

## Event Publishing

```java
@Service
public class OrderEventPublisher {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void publishOrderCreated(Order order) {
        OrderCreatedEvent event = new OrderCreatedEvent(order);

        rabbitTemplate.convertAndSend(
            "order-exchange",
            "order.created",
            event
        );

        log.info("Published order.created event: {}", order.getId());
    }

    public void publishOrderCancelled(Order order) {
        OrderCancelledEvent event = new OrderCancelledEvent(order);

        rabbitTemplate.convertAndSend(
            "order-exchange",
            "order.cancelled",
            event
        );

        log.info("Published order.cancelled event: {}", order.getId());
    }
}
```

## HTTP Clients (Feign)

```java
@FeignClient(name = "product-service", url = "${product-service.url}")
public interface ProductServiceClient {

    @PostMapping("/api/inventory/reserve")
    ReserveResponse reserveInventory(@RequestBody ReserveRequest request);

    @PostMapping("/api/inventory/refund")
    RefundResponse refundInventory(@RequestBody RefundRequest request);
}

@FeignClient(name = "payment-service", url = "${payment-service.url}")
public interface PaymentServiceClient {

    @PostMapping("/payments")
    PaymentResponse createPayment(@RequestBody PaymentRequest request);
}
```

## WebSocket Configuration

```java
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(orderWebSocketHandler(), "/ws/orders")
            .setAllowedOrigins("*");
    }

    @Bean
    public WebSocketHandler orderWebSocketHandler() {
        return new OrderWebSocketHandler();
    }
}

@Component
public class OrderWebSocketHandler extends TextWebSocketHandler {

    private static final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
    }

    public void broadcastOrderUpdate(Order order) {
        String message = "{ \"event\": \"order.updated\", \"order\": " +
                         toJson(order) + " }";

        sessions.forEach(session -> {
            try {
                session.sendMessage(new TextMessage(message));
            } catch (IOException e) {
                log.error("Error sending message", e);
            }
        });
    }
}
```

## Session Configuration

```java
@Configuration
@EnableSpringHttpSession
public class SessionConfig {

    @Bean
    public LettuceConnectionFactory connectionFactory() {
        return new LettuceConnectionFactory();
    }

    @Bean
    public SessionRepository sessionRepository(
            LettuceConnectionFactory connectionFactory) {
        return new RedisIndexedSessionRepository(connectionFactory);
    }
}
```

## OrderService Orchestration

```java
@Service
@Transactional
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductServiceClient productClient;

    @Autowired
    private PaymentServiceClient paymentClient;

    @Autowired
    private OrderEventPublisher eventPublisher;

    @Autowired
    private OrderEmailService emailService;

    @Autowired
    private CartService cartService;

    public Order createOrder(Long userId, CreateOrderRequest request)
            throws OrderCreationException {

        try {
            // 1. Create pending order
            Order order = new Order();
            order.setUserId(userId);
            order.setStatus(OrderStatus.PENDING);
            order.setShippingAddress(request.getShippingAddress());
            Order savedOrder = orderRepository.save(order);

            // 2. Reserve inventory (may throw exception)
            ReserveResponse reserved = productClient.reserveInventory(
                new ReserveRequest(order.getItems())
            );

            if (!reserved.isSuccess()) {
                throw new OutOfStockException("Failed to reserve stock");
            }

            // 3. Create payment
            PaymentResponse payment = paymentClient.createPayment(
                new PaymentRequest(savedOrder)
            );

            // 4. Publish event (async)
            eventPublisher.publishOrderCreated(savedOrder);

            // 5. Send WebSocket notification
            orderWebSocketHandler.broadcastOrderUpdate(savedOrder);

            // 6. Clear user cart
            cartService.clearCart(userId.toString());

            // 7. Send email (async)
            emailService.sendOrderConfirmation(savedOrder);

            return savedOrder;

        } catch (Exception e) {
            // Rollback on failure
            log.error("Error creating order", e);

            // Refund inventory if reserved
            if (reserved != null) {
                productClient.refundInventory(/* ... */);
            }

            throw new OrderCreationException("Failed to create order", e);
        }
    }
}
```

---
