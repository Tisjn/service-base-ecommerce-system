package com.dtpshop.orderservice.event;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderConfirmedEvent {
    private Long orderId;
    private Long userId;
    private String customerEmail;
    private String correlationId;
    private LocalDateTime confirmedAt;
}
