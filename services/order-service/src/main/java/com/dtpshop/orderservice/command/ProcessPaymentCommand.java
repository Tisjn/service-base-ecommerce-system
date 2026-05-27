package com.dtpshop.orderservice.command;

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
public class ProcessPaymentCommand {
    private Long orderId;
    private Long userId;
    private String correlationId;
    private List<CartItemDto> cartItems;
    private BigDecimal totalAmount;
    private String paymentMethod;
    private String cartKey;
    private String customerEmail;
    private LocalDateTime requestedAt;
}
