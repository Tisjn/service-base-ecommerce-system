package com.dtpshop.orderservice.command;

import com.dtpshop.orderservice.dto.CartItemDto;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinalizeOrderCommand {
    private Long orderId;
    private Long userId;
    private String correlationId;
    private String cartKey;
    private String customerEmail;
    private boolean successful;
    private String paymentId;
    private String paymentStatus;
    private String paymentUrl;
    private String failureReason;
    private boolean refundInventory;
    private List<CartItemDto> cartItems;
    private LocalDateTime requestedAt;
}
