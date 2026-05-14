package com.dtpshop.orderservice.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dtpshop.orderservice.dto.CartItemDto;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

class ProductServiceClientTest {

    @Test
    void shouldReserveInventoryThroughProductApiPath() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        when(restTemplate.exchange(
                eq("http://localhost:3003/api/inventory/reserve"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Void.class)))
                .thenReturn(ResponseEntity.noContent().build());

        ProductServiceClient client = new ProductServiceClient(restTemplate, "http://localhost:3003");

        boolean reserved = client.reserveInventory(List.of(
                new CartItemDto(100L, "Suitcase", 2, new BigDecimal("49.99"))), "corr-100");

        assertThat(reserved).isTrue();
    }

    @Test
    void shouldNotDuplicateApiPathWhenBaseUrlAlreadyIncludesApi() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        when(restTemplate.exchange(
                eq("http://localhost:3003/api/inventory/reserve"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Void.class)))
                .thenReturn(ResponseEntity.noContent().build());

        ProductServiceClient client = new ProductServiceClient(restTemplate, "http://localhost:3003/api/");

        boolean reserved = client.reserveInventory(List.of(
                new CartItemDto(100L, "Suitcase", 1, new BigDecimal("49.99"))), "corr-101");

        assertThat(reserved).isTrue();
    }

    @Test
    void shouldRefundInventoryThroughProductApiPath() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        when(restTemplate.exchange(
                eq("http://localhost:3003/api/inventory/refund"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Void.class)))
                .thenReturn(ResponseEntity.noContent().build());

        ProductServiceClient client = new ProductServiceClient(restTemplate, "http://localhost:3003");
        List<CartItemDto> items = List.of(new CartItemDto(100L, "Suitcase", 2, new BigDecimal("49.99")));

        client.refundInventory(items, "corr-102");

        verify(restTemplate).exchange(
                eq("http://localhost:3003/api/inventory/refund"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Void.class));
    }
}
