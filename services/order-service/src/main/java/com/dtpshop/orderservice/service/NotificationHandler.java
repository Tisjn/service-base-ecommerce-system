package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.event.PaymentProcessedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "order.saga.payment-enabled", havingValue = "true")
public class NotificationHandler {

    private static final Logger logger = LoggerFactory.getLogger(NotificationHandler.class);
    private final OrderService orderService;
    private final CartService cartService;

    public NotificationHandler(OrderService orderService, CartService cartService) {
        this.orderService = orderService;
        this.cartService = cartService;
    }

    @RabbitListener(queues = "notification.send")
    public void handlePaymentProcessed(PaymentProcessedEvent event) {
        logger.info("NotificationHandler received PaymentProcessed for orderId={}", event.getOrderId());
        orderService.confirmOrder(event.getOrderId(), event.getPaymentId());
        cartService.clearCart(event.getUserId());
        logger.info("Order confirmed and cart cleared for orderId={}, userId={}", event.getOrderId(),
                event.getUserId());
        logger.info("Simulated notification sent to userId={} for orderId={}", event.getUserId(), event.getOrderId());
    }
}
