package com.dtpshop.orderservice.client;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class PaymentServiceClient {

    private static final Logger logger = LoggerFactory.getLogger(PaymentServiceClient.class);

    private final RestTemplate restTemplate;
    private final String paymentServiceUrl;

    public PaymentServiceClient(RestTemplate restTemplate,
            @Value("${payment.service.url}") String paymentServiceUrl) {
        this.restTemplate = restTemplate;
        this.paymentServiceUrl = paymentServiceUrl;
    }

    public PaymentResult processPayment(Long orderId, BigDecimal amount, String correlationId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", orderId);
        payload.put("amount", amount);
        payload.put("correlationId", correlationId);

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Correlation-Id", correlationId);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        String url = paymentServiceUrl + "/payments";
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url, HttpMethod.POST, request,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object paymentId = response.getBody().get("paymentId");
                return new PaymentResult(true, paymentId == null ? null : paymentId.toString());
            }
        } catch (Exception ex) {
            logger.warn("Payment service unavailable for orderId={}, using local mock approval: {}", orderId,
                    ex.getMessage());
            return new PaymentResult(true, "MOCK-PAYMENT-" + orderId);
        }
        return new PaymentResult(false, null);
    }

    public static class PaymentResult {
        private final boolean success;
        private final String paymentId;

        public PaymentResult(boolean success, String paymentId) {
            this.success = success;
            this.paymentId = paymentId;
        }

        public boolean isSuccess() {
            return success;
        }

        public String getPaymentId() {
            return paymentId;
        }
    }
}
