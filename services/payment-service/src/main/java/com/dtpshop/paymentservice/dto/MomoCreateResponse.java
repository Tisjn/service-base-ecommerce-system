package com.dtpshop.paymentservice.dto;

public record MomoCreateResponse(
        String partnerCode,
        String orderId,
        String requestId,
        Long amount,
        Long responseTime,
        String message,
        Integer resultCode,
        String payUrl,
        String deeplink,
        String qrCodeUrl,
        String transId
) {
}
