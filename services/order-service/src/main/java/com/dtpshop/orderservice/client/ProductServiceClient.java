package com.dtpshop.orderservice.client;

import com.dtpshop.orderservice.dto.CartItemDto;
import com.dtpshop.orderservice.dto.ProductSnapshotDto;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class ProductServiceClient {

    private static final Logger logger = LoggerFactory.getLogger(ProductServiceClient.class);

    private final RestTemplate restTemplate;
    private final String productServiceUrl;

    public ProductServiceClient(RestTemplate restTemplate,
            @Value("${product.service.url}") String productServiceUrl) {
        this.restTemplate = restTemplate;
        this.productServiceUrl = productServiceUrl;
    }

    public boolean reserveInventory(List<CartItemDto> items, String correlationId) {
        if (items.isEmpty()) {
            return true;
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("items", items);
        payload.put("correlationId", correlationId);

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Correlation-Id", correlationId);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        String url = buildInventoryUrl("/reserve");
        try {
            ResponseEntity<Void> response = restTemplate.exchange(url, HttpMethod.POST, request, Void.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception ex) {
            logger.warn("Failed to reserve inventory: {}", ex.getMessage());
            return false;
        }
    }

    public List<CartItemDto> getCart(Long userId) {
        String url = buildApiUrl("/cart/" + userId);
        try {
            ResponseEntity<List<CartItemDto>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    HttpEntity.EMPTY,
                    new ParameterizedTypeReference<List<CartItemDto>>() {
                    });
            return response.getBody() == null ? List.of() : response.getBody();
        } catch (Exception ex) {
            logger.warn("Failed to fetch cart from product-service: {}", ex.getMessage());
            return List.of();
        }
    }

    public ProductSnapshotDto getProduct(Long productId) {
        String url = buildApiUrl("/products/" + productId);
        try {
            ResponseEntity<ProductSnapshotDto> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    HttpEntity.EMPTY,
                    ProductSnapshotDto.class);
            return response.getBody();
        } catch (Exception ex) {
            logger.warn("Failed to fetch product {} from product-service: {}", productId, ex.getMessage());
            return null;
        }
    }

    public void clearCart(Long userId) {
        String url = buildApiUrl("/cart/" + userId);
        try {
            restTemplate.exchange(url, HttpMethod.DELETE, HttpEntity.EMPTY, Void.class);
        } catch (Exception ex) {
            logger.warn("Failed to clear cart in product-service: {}", ex.getMessage());
        }
    }

    public void refundInventory(List<CartItemDto> items, String correlationId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("items", items);
        payload.put("correlationId", correlationId);

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Correlation-Id", correlationId);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        String url = buildInventoryUrl("/refund");
        try {
            restTemplate.exchange(url, HttpMethod.POST, request, Void.class);
        } catch (Exception ex) {
            logger.warn("Failed to refund inventory: {}", ex.getMessage());
        }
    }

    private String buildInventoryUrl(String path) {
        return buildApiUrl("/inventory" + path);
    }

    private String buildApiUrl(String path) {
        String baseUrl = productServiceUrl.replaceAll("/+$", "");
        if (baseUrl.endsWith("/api")) {
            return baseUrl + path;
        }
        return baseUrl + "/api" + path;
    }
}
