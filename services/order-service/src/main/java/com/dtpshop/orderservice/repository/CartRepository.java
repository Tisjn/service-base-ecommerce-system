package com.dtpshop.orderservice.repository;

import com.dtpshop.orderservice.dto.CartItemDto;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CartRepository {

    private static final Logger logger = LoggerFactory.getLogger(CartRepository.class);
    private final RedisTemplate<String, Object> redisTemplate;
    private static final Duration TTL = Duration.ofHours(24);
    private final ConcurrentMap<String, List<CartItemDto>> localFallbackCache = new ConcurrentHashMap<>();

    public CartRepository(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public List<CartItemDto> getCart(String userId) {
        String key = cartKey(userId);
        try {
            Object value = redisTemplate.opsForValue().get(key);
            if (value instanceof List<?>) {
                List<?> raw = (List<?>) value;
                List<CartItemDto> items = new ArrayList<>();
                for (Object item : raw) {
                    if (item instanceof CartItemDto) {
                        items.add((CartItemDto) item);
                    } else {
                        // fallback if JSON serializer returns LinkedHashMap
                        try {
                            items.add(CartItemDto.fromObject(item));
                        } catch (Exception ignored) {
                        }
                    }
                }
                return items;
            }
            return localFallbackCache.getOrDefault(key, new ArrayList<>());
        } catch (Exception ex) {
            logger.warn("Redis unavailable or unreadable for getCart({}), using in-memory fallback", userId, ex);
            return localFallbackCache.getOrDefault(key, new ArrayList<>());
        }
    }

    public void saveCart(String userId, List<CartItemDto> items) {
        String key = cartKey(userId);
        localFallbackCache.put(key, new ArrayList<>(items));
        try {
            redisTemplate.opsForValue().set(key, items, TTL);
        } catch (Exception ex) {
            logger.warn("Redis unavailable or unserializable for saveCart({}), storing cart in-memory", userId, ex);
        }
    }

    public void clearCart(String userId) {
        String key = cartKey(userId);
        localFallbackCache.remove(key);
        try {
            redisTemplate.delete(key);
        } catch (Exception ex) {
            logger.warn("Redis unavailable for clearCart({}), clearing in-memory cart", userId, ex);
        }
    }

    private String cartKey(String userId) {
        // Ví dụ: cart:guest:<sessionId> trước đăng nhập, cart:<userId> sau đăng nhập.
        return "cart:" + userId;
    }
}
