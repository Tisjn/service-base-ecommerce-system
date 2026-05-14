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
public class OrderCreatedEvent {
    private Long orderId;
    private Long userId;
    private String shippingAddress;
    private List<CartItemDto> cartItems;
    private BigDecimal totalAmount;
    private String correlationId;
    private LocalDateTime createdAt;
}
