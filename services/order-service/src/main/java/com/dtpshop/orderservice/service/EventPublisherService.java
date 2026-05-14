package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.config.RabbitMqConfig;
import com.dtpshop.orderservice.event.InventoryReservedEvent;
import com.dtpshop.orderservice.event.OrderCancelledEvent;
import com.dtpshop.orderservice.event.OrderCreatedEvent;
import com.dtpshop.orderservice.event.PaymentFailedEvent;
import com.dtpshop.orderservice.event.PaymentProcessedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class EventPublisherService {

    private static final Logger logger = LoggerFactory.getLogger(EventPublisherService.class);
    private final RabbitTemplate rabbitTemplate;

    public EventPublisherService(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishOrderCreated(OrderCreatedEvent event) {
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, "order.created", event);
        logger.info("Published OrderCreated event for orderId={}", event.getOrderId());
    }

    public void publishInventoryReserved(InventoryReservedEvent event) {
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, "inventory.reserved", event);
        logger.info("Published InventoryReserved event for orderId={}", event.getOrderId());
    }

    public void publishPaymentProcessed(PaymentProcessedEvent event) {
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, "payment.processed", event);
        logger.info("Published PaymentProcessed event for orderId={}", event.getOrderId());
    }

    public void publishPaymentFailed(PaymentFailedEvent event) {
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, "payment.failed", event);
        logger.info("Published PaymentFailed event for orderId={}", event.getOrderId());
    }

    public void publishOrderCancelled(OrderCancelledEvent event) {
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, "order.cancelled", event);
        logger.info("Published OrderCancelled event for orderId={}", event.getOrderId());
    }
}
