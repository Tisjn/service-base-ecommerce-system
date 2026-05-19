package com.dtpshop.orderservice.client;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
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
        return createPayment(orderId, amount, "MOMO", correlationId);
    }

    public PaymentResult createPayment(Long orderId, BigDecimal amount, String paymentMethod, String correlationId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", orderId);
        payload.put("amount", amount);
        payload.put("paymentMethod", paymentMethod);
        payload.put("orderInfo", "Thanh toan don hang #" + orderId);
        payload.put("correlationId", correlationId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("X-Correlation-Id", correlationId);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        String url = paymentServiceUrl + "/payments";
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url, HttpMethod.POST, request,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object paymentId = firstPresent(response.getBody(), "id", "paymentId");
                Object paymentUrl = response.getBody().get("paymentUrl");
                Object status = response.getBody().get("status");
                return new PaymentResult(
                        true,
                        paymentId == null ? null : paymentId.toString(),
                        paymentUrl == null ? null : paymentUrl.toString(),
                        status == null ? null : status.toString());
            }
        } catch (Exception ex) {
            logger.warn("Payment service unavailable for orderId={}: {}", orderId, ex.getMessage());
            return fallbackApproval(orderId, paymentMethod);
        }
        return new PaymentResult(false, null, null, null);
    }

    public PaymentSnapshot getLatestPayment(Long orderId) {
        String url = paymentServiceUrl + "/payments?orderId=" + orderId;
        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {
                    });
            if (response.getStatusCode().is2xxSuccessful()
                    && response.getBody() != null
                    && !response.getBody().isEmpty()) {
                Map<String, Object> payment = response.getBody().get(0);
                Object paymentId = firstPresent(payment, "id", "paymentId");
                Object method = payment.get("paymentMethod");
                Object status = payment.get("status");
                return new PaymentSnapshot(
                        paymentId == null ? null : paymentId.toString(),
                        method == null ? null : method.toString(),
                        status == null ? null : status.toString());
            }
        } catch (Exception ex) {
            logger.warn("Cannot fetch payment status for orderId={}: {}", orderId, ex.getMessage());
        }
        return null;
    }

    private Object firstPresent(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            Object value = body.get(key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private PaymentResult fallbackApproval(Long orderId, String paymentMethod) {
        String normalizedMethod = paymentMethod == null ? "" : paymentMethod.trim().toUpperCase();
        if (!"COD".equals(normalizedMethod) && !"MOMO".equals(normalizedMethod)) {
            return new PaymentResult(false, null, null, null);
        }
        return new PaymentResult(true, "MOCK-PAYMENT-" + orderId, null, "PENDING");
    }

    public static class PaymentResult {
        private final boolean success;
        private final String paymentId;
        private final String paymentUrl;
        private final String status;

        public PaymentResult(boolean success, String paymentId, String paymentUrl, String status) {
            this.success = success;
            this.paymentId = paymentId;
            this.paymentUrl = paymentUrl;
            this.status = status;
        }

        public boolean isSuccess() {
            return success;
        }

        public String getPaymentId() {
            return paymentId;
        }

        public String getPaymentUrl() {
            return paymentUrl;
        }

        public String getStatus() {
            return status;
        }
    }

    public static class PaymentSnapshot {
        private final String paymentId;
        private final String paymentMethod;
        private final String status;

        public PaymentSnapshot(String paymentId, String paymentMethod, String status) {
            this.paymentId = paymentId;
            this.paymentMethod = paymentMethod;
            this.status = status;
        }

        public String getPaymentId() {
            return paymentId;
        }

        public String getPaymentMethod() {
            return paymentMethod;
        }

        public String getStatus() {
            return status;
        }
    }
}
