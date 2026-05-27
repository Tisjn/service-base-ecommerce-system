package com.dtpshop.orderservice.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

class PaymentServiceClientTest {

    @Test
    void shouldFailMomoWhenPaymentServiceIsUnavailable() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        when(restTemplate.exchange(
                eq("http://localhost:3005/payments"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenThrow(new ResourceAccessException("Connection refused"));

        PaymentServiceClient client = new PaymentServiceClient(restTemplate, "http://localhost:3005");

        PaymentServiceClient.PaymentResult result = client.processPayment(42L, BigDecimal.valueOf(99.98), "corr-42");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getPaymentId()).isNull();
    }

    @Test
    void shouldReturnMockApprovalForCodWhenPaymentServiceIsUnavailable() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        when(restTemplate.exchange(
                eq("http://localhost:3005/payments"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenThrow(new ResourceAccessException("Connection refused"));

        PaymentServiceClient client = new PaymentServiceClient(restTemplate, "http://localhost:3005");

        PaymentServiceClient.PaymentResult result = client.createPayment(
                42L, BigDecimal.valueOf(99.98), "COD", "corr-42");

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getPaymentId()).isEqualTo("MOCK-PAYMENT-42");
    }

    @Test
    void shouldReturnGatewayResponseWhenPaymentServiceRepliesSuccessfully() {
        RestTemplate restTemplate = mock(RestTemplate.class);
        when(restTemplate.exchange(
                eq("http://localhost:3005/payments"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(ResponseEntity.ok(Map.of("paymentId", "PAY-123")));

        PaymentServiceClient client = new PaymentServiceClient(restTemplate, "http://localhost:3005");

        PaymentServiceClient.PaymentResult result = client.processPayment(42L, BigDecimal.valueOf(99.98), "corr-42");

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getPaymentId()).isEqualTo("PAY-123");
    }
}
