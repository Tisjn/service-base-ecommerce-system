package com.dtpshop.orderservice.event;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderCancelledEvent {
    private Long orderId;
    private Long userId;
    private String reason;
    private String correlationId;
    private LocalDateTime cancelledAt;
}
