package com.dtpshop.paymentservice.dto;

import com.dtpshop.paymentservice.model.Payment;
import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponse(
        Long id,
        Long orderId,
        String paymentMethod,
        String provider,
        BigDecimal amount,
        String status,
        String transactionCode,
        String gatewayTransactionId,
        String paymentUrl,
        Instant paidAt,
        Instant expiredAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getOrderId(),
                payment.getPaymentMethod(),
                payment.getProvider(),
                payment.getAmount(),
                payment.getStatus(),
                payment.getTransactionCode(),
                payment.getGatewayTransactionId(),
                payment.getPaymentUrl(),
                payment.getPaidAt(),
                payment.getExpiredAt(),
                payment.getCreatedAt(),
                payment.getUpdatedAt()
        );
    }
}
