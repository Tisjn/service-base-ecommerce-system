package com.dtpshop.orderservice.event;

import com.dtpshop.orderservice.dto.CartItemDto;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentProcessedEvent {
    private Long orderId;
    private Long userId;
    private String paymentId;
    private String correlationId;
    private List<CartItemDto> cartItems;
    private BigDecimal totalAmount;
    private String paymentStatus;
    private String paymentUrl;
    private String paymentMethod;
    private String cartKey;
    private String customerEmail;
    private LocalDateTime processedAt;
}
