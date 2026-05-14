package com.dtpshop.productservice.client;

import com.dtpshop.productservice.dto.CartItemSyncRequest;
import com.dtpshop.productservice.model.CartItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class OrderServiceClient {

    private static final Logger logger = LoggerFactory.getLogger(OrderServiceClient.class);

    private final RestTemplate restTemplate;
    private final String orderServiceUrl;

    public OrderServiceClient(RestTemplate restTemplate,
            @Value("${order.service.url:http://localhost:3004}") String orderServiceUrl) {
        this.restTemplate = restTemplate;
        this.orderServiceUrl = orderServiceUrl;
    }

    public void syncAddOrUpdateCartItem(Long userId, CartItem cartItem) {
        if (userId == null || cartItem == null || cartItem.getProductId() == null) {
            return;
        }
        if (cartItem.getQuantity() == null || cartItem.getQuantity() <= 0) {
            syncRemoveCartItem(userId, cartItem.getProductId());
            return;
        }

        String url = orderServiceUrl + "/api/cart/" + userId + "/items";
        CartItemSyncRequest request = new CartItemSyncRequest(
                cartItem.getProductId(),
                cartItem.getProductName(),
                cartItem.getQuantity(),
                cartItem.getPrice());
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Type", "application/json");
            HttpEntity<CartItemSyncRequest> entity = new HttpEntity<>(request, headers);
            restTemplate.postForEntity(url, entity, Void.class);
        } catch (Exception ex) {
            logger.warn("Failed to sync cart item to order-service: {}", ex.getMessage());
        }
    }

    public void syncRemoveCartItem(Long userId, Long productId) {
        if (userId == null || productId == null) {
            return;
        }
        String url = orderServiceUrl + "/api/cart/" + userId + "/items/" + productId;
        try {
            restTemplate.delete(url);
        } catch (Exception ex) {
            logger.warn("Failed to sync cart removal to order-service: {}", ex.getMessage());
        }
    }

    public void syncClearCart(Long userId) {
        if (userId == null) {
            return;
        }
        String url = orderServiceUrl + "/api/cart/" + userId;
        try {
            restTemplate.delete(url);
        } catch (Exception ex) {
            logger.warn("Failed to sync cart clear to order-service: {}", ex.getMessage());
        }
    }
}
