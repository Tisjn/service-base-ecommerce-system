package com.dtpshop.orderservice.dto;

import com.dtpshop.orderservice.model.OrderStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OrderResponseDto {
    private Long orderId;
    private Long userId;
    private Long addressId;
    private String orderCode;
    private OrderStatus status;
    private BigDecimal subtotal;
    private BigDecimal shippingFee;
    private BigDecimal finalAmount;
    private String note;
    private String paymentMethod;
    private Long paymentId;
    private String paymentStatus;
    private String paymentUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    private List<CartItemDto> items;
    private BigDecimal grossProfit;

    public BigDecimal getTotalAmount() {
        return finalAmount;
    }
}
