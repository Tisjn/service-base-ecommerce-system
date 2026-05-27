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
public class PaymentFailedEvent {
    private Long orderId;
    private Long userId;
    private String reason;
    private String correlationId;
    private List<CartItemDto> cartItems;
    private BigDecimal totalAmount;
    private String cartKey;
    private boolean refundInventory;
    private String customerEmail;
    private LocalDateTime failedAt;
}
