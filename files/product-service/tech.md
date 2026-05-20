# Product Service — Tech Stack

**Port:** 3003 | **Language:** Java 21 | **Framework:** Spring Boot 3.x + Redis

## Ngôn ngữ & Runtime

**Java 21 + Spring Boot 3.x** — Lý do chọn:

- Spring Data JPA + Pagination JPQL
- Spring Data Redis cho cache-aside pattern
- Native queries hỗ trợ complex filtering
- Transaction management cho inventory

## Framework & Thư viện

| Thư viện              | Mục đích              |
| --------------------- | --------------------- |
| **Spring Web**        | REST controller       |
| **Spring Data JPA**   | ORM mapping           |
| **Spring Data Redis** | Caching, cart storage |
| **Spring Security**   | JWT filter            |
| **Redis (Lettuce)**   | Redis client          |
| **MySQL Connector**   | MySQL driver          |
| **Spring Validation** | Bean validation       |
| **Lombok**            | Code generation       |

## Cấu hình Redis

```yaml
spring:
  redis:
    host: redis-cache
    port: 6379
    password: ${REDIS_PASSWORD:}
    timeout: 2000ms
    jedis:
      pool:
        max-active: 20
        max-idle: 10
        min-idle: 5
```

## Redis Key Patterns & TTL

| Key                          | Value        | TTL      | Mục đích          |
| ---------------------------- | ------------ | -------- | ----------------- |
| `product:{id}`               | JSON product | 1 hour   | Product cache     |
| `products:list:{categoryId}` | JSON array   | 1 hour   | Category products |
| `cart:{userId}`              | JSON cart    | 24 hours | Cart items        |

## Cache-Aside Pattern Implementation

```java
@Service
public class ProductService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private ProductRepository productRepository;

    private static final String CACHE_KEY_PREFIX = "product:";
    private static final Long CACHE_TTL = 3600L; // 1 hour

    public Product getProduct(Long id) {
        String cacheKey = CACHE_KEY_PREFIX + id;

        // Try Redis
        Product cached = (Product) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            log.info("Cache HIT for product:{}", id);
            return cached;
        }

        // Cache MISS → Query DB
        log.info("Cache MISS for product:{}", id);
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new ProductNotFoundException("Not found"));

        // Store in Redis
        redisTemplate.opsForValue().set(cacheKey, product,
            Duration.ofSeconds(CACHE_TTL));

        return product;
    }

    // Invalidate cache on update/delete
    public void invalidateProductCache(Long productId) {
        String cacheKey = CACHE_KEY_PREFIX + productId;
        redisTemplate.delete(cacheKey);
        log.info("Cache invalidated for product:{}", productId);
    }
}
```

## Cart Storage in Redis

```java
@Service
public class CartService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final String CART_KEY_PREFIX = "cart:";
    private static final Long CART_TTL = 86400L; // 24 hours

    public CartDTO getCart(String userId) {
        String cartKey = CART_KEY_PREFIX + userId;
        CartDTO cart = (CartDTO) redisTemplate.opsForValue().get(cartKey);

        if (cart == null) {
            cart = new CartDTO(userId, new ArrayList<>());
        }

        return cart;
    }

    public CartDTO addToCart(String userId, Long productId, Integer quantity) {
        CartDTO cart = getCart(userId);

        CartItemDTO item = new CartItemDTO(productId, quantity);
        cart.getItems().add(item);

        // Save to Redis with 24h expiry
        String cartKey = CART_KEY_PREFIX + userId;
        redisTemplate.opsForValue().set(cartKey, cart,
            Duration.ofSeconds(CART_TTL));

        return cart;
    }

    public void clearCart(String userId) {
        String cartKey = CART_KEY_PREFIX + userId;
        redisTemplate.delete(cartKey);
    }
}
```

## Repository with Pagination

```java
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByCategoryIdAndStatus(
        Long categoryId,
        String status,
        Pageable pageable
    );

    @Query("""
        SELECT p FROM Product p
        WHERE p.status = :status
        AND p.price BETWEEN :minPrice AND :maxPrice
        AND (:search IS NULL OR p.name LIKE %:search%)
    """)
    Page<Product> searchWithFilters(
        @Param("status") String status,
        @Param("minPrice") Double minPrice,
        @Param("maxPrice") Double maxPrice,
        @Param("search") String search,
        Pageable pageable
    );
}
```

## Inventory Reservation

```java
@Service
@Transactional
public class InventoryService {

    @Autowired
    private ProductRepository productRepository;

    public void reserveStock(Long productId, Integer quantity) {
        Product product = productRepository.findById(productId)
            .orElseThrow();

        if (product.getStock() < quantity) {
            throw new OutOfStockException(
                "Not enough stock for product: " + productId
            );
        }

        // Atomic update
        product.setStock(product.getStock() - quantity);
        productRepository.save(product);

        // Invalidate cache
        productCache.invalidate(productId);
    }

    public void refundStock(Long productId, Integer quantity) {
        Product product = productRepository.findById(productId)
            .orElseThrow();

        product.setStock(product.getStock() + quantity);
        productRepository.save(product);

        productCache.invalidate(productId);
    }
}
```

---
