package com.dtpshop.orderservice.websocket;

import com.dtpshop.orderservice.dto.OrderResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class OrderWebSocketNotifier {

    private static final Logger logger = LoggerFactory.getLogger(OrderWebSocketNotifier.class);

    private final SimpMessagingTemplate messagingTemplate;

    public OrderWebSocketNotifier(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyNewOrder(OrderResponseDto order) {
        try {
            // send a lightweight summary instead of full DTO
            var summary = new java.util.HashMap<String, Object>();
            summary.put("orderId", order.getOrderId());
            summary.put("totalAmount", order.getTotalAmount());
            summary.put("createdAt", order.getCreatedAt());
            summary.put("userId", order.getUserId());
            messagingTemplate.convertAndSend("/topic/new_order", summary);
            logger.info("Notified admins about new order id={}", order.getOrderId());
        } catch (Exception ex) {
            logger.warn("Failed to notify admins via WebSocket: {}", ex.getMessage());
        }
    }
}
