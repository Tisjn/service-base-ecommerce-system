package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.command.SendNotificationCommand;
import com.dtpshop.orderservice.config.RabbitMqConfig;
import com.dtpshop.orderservice.model.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
public class NotificationHandler {

    private static final Logger logger = LoggerFactory.getLogger(NotificationHandler.class);
    private final OrderService orderService;
    private final OrderEmailService orderEmailService;

    public NotificationHandler(OrderService orderService, OrderEmailService orderEmailService) {
        this.orderService = orderService;
        this.orderEmailService = orderEmailService;
    }

    @RabbitListener(queues = RabbitMqConfig.NOTIFICATION_QUEUE)
    public void handleSendNotification(SendNotificationCommand command) {
        logger.info("NotificationHandler received SendNotification command for orderId={}", command.getOrderId());
        Order order = orderService.getOrder(command.getOrderId());
        orderEmailService.sendOrderPlacedEmail(command.getCustomerEmail(), order);
        logger.info("Order notification sent for orderId={}, userId={}", command.getOrderId(), command.getUserId());
    }
}
