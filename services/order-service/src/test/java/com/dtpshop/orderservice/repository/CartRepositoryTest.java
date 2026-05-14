package com.dtpshop.orderservice.repository;

import com.dtpshop.orderservice.dto.CartItemDto;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartRepositoryTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    private CartRepository cartRepository;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        cartRepository = new CartRepository(redisTemplate);
    }

    @Test
    void shouldUseFallbackWhenRedisUnavailableOnGet() {
        when(valueOperations.get(eq("cart:1")))
                .thenThrow(new RedisConnectionFailureException("Connection refused"));

        List<CartItemDto> items = cartRepository.getCart("1");

        assertThat(items).isEmpty();
    }

    @Test
    void shouldStoreCartInMemoryWhenRedisSaveFails() {
        CartItemDto item = new CartItemDto(100L, "Test Product", 2, new BigDecimal("49.99"));
        doThrow(new RedisConnectionFailureException("Connection refused"))
                .when(valueOperations).set(eq("cart:1"), any(), any());

        cartRepository.saveCart("1", List.of(item));
        List<CartItemDto> items = cartRepository.getCart("1");

        assertThat(items).hasSize(1)
                .first()
                .returns(100L, CartItemDto::getProductId)
                .returns(2, CartItemDto::getQuantity);
    }
}
