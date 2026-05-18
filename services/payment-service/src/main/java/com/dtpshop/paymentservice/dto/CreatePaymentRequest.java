package com.dtpshop.paymentservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreatePaymentRequest(
        @NotNull(message = "orderId khong duoc de trong")
        Long orderId,

        @NotBlank(message = "paymentMethod khong duoc de trong")
        String paymentMethod,

        @NotNull(message = "amount khong duoc de trong")
        @DecimalMin(value = "0.01", message = "amount phai lon hon 0")
        BigDecimal amount,

        String orderInfo,

        String redirectUrl,

        String ipnUrl
) {
}
