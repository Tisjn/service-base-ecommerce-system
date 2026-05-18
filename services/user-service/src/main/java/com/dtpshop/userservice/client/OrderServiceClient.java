package com.dtpshop.userservice.client;

import com.dtpshop.userservice.exception.ApiException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
public class OrderServiceClient {

    private final RestTemplate restTemplate;
    private final String orderServiceUrl;

    public OrderServiceClient(
            RestTemplate restTemplate,
            @Value("${order.service.url}") String orderServiceUrl
    ) {
        this.restTemplate = restTemplate;
        this.orderServiceUrl = orderServiceUrl.replaceAll("/+$", "");
    }

    public boolean hasOrders(Long userId) {
        OrderLookupResult apiResult = hasOrdersAtPath(userId, "/api/orders/user/");
        if (apiResult.reached()) {
            return apiResult.hasOrders();
        }

        OrderLookupResult directResult = hasOrdersAtPath(userId, "/orders/user/");
        if (directResult.reached()) {
            return directResult.hasOrders();
        }

        throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Khong the kiem tra lich su don hang. Tam thoi khong xoa tai khoan."
        );
    }

    private OrderLookupResult hasOrdersAtPath(Long userId, String path) {
        try {
            ResponseEntity<List> response = restTemplate.getForEntity(orderServiceUrl + path + userId, List.class);
            List<?> body = response.getBody();
            return new OrderLookupResult(true, body != null && !body.isEmpty());
        } catch (HttpClientErrorException.NotFound ignored) {
            return new OrderLookupResult(false, false);
        } catch (RestClientException ignored) {
            return new OrderLookupResult(false, false);
        }
    }

    private record OrderLookupResult(boolean reached, boolean hasOrders) {
    }
}
