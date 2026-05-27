package com.dtpshop.orderservice.command;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendNotificationCommand {
    private Long orderId;
    private Long userId;
    private String customerEmail;
    private String correlationId;
    private LocalDateTime requestedAt;
}
