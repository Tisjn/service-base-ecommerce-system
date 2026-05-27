package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.command.FinalizeOrderCommand;
import com.dtpshop.orderservice.command.ProcessPaymentCommand;
import com.dtpshop.orderservice.command.ReserveInventoryCommand;
import com.dtpshop.orderservice.command.SendNotificationCommand;
import com.dtpshop.orderservice.config.RabbitMqConfig;
import com.dtpshop.orderservice.event.InventoryReservedEvent;
import com.dtpshop.orderservice.event.OrderConfirmedEvent;
import com.dtpshop.orderservice.event.OrderCreatedEvent;
import com.dtpshop.orderservice.event.PaymentFailedEvent;
import com.dtpshop.orderservice.event.PaymentProcessedEvent;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
public class OrderSagaOrchestrator {

    private static final Logger logger = LoggerFactory.getLogger(OrderSagaOrchestrator.class);

    private final EventPublisherService eventPublisherService;

    public OrderSagaOrchestrator(EventPublisherService eventPublisherService) {
        this.eventPublisherService = eventPublisherService;
    }

    @RabbitListener(queues = RabbitMqConfig.ORDER_CREATED_QUEUE)
    public void handleOrderCreated(OrderCreatedEvent event) {
        logger.info("Starting order saga orderId={}, userId={}, correlationId={}",
                event.getOrderId(), event.getUserId(), event.getCorrelationId());

        eventPublisherService.publishReserveInventoryCommand(new ReserveInventoryCommand(
                event.getOrderId(),
                event.getUserId(),
                event.getCorrelationId(),
                event.getCartItems(),
                event.getTotalAmount(),
                event.getPaymentMethod(),
                event.getCartKey(),
                event.getCustomerEmail(),
                LocalDateTime.now()));
    }

    @RabbitListener(queues = RabbitMqConfig.INVENTORY_RESERVED_QUEUE)
    public void handleInventoryReserved(InventoryReservedEvent event) {
        logger.info("Inventory reserved orderId={}, userId={}, correlationId={}",
                event.getOrderId(), event.getUserId(), event.getCorrelationId());

        eventPublisherService.publishProcessPaymentCommand(new ProcessPaymentCommand(
                event.getOrderId(),
                event.getUserId(),
                event.getCorrelationId(),
                event.getCartItems(),
                event.getTotalAmount(),
                event.getPaymentMethod(),
                event.getCartKey(),
                event.getCustomerEmail(),
                LocalDateTime.now()));
    }

    @RabbitListener(queues = RabbitMqConfig.INVENTORY_FAILED_QUEUE)
    public void handleInventoryFailed(PaymentFailedEvent event) {
        logger.warn("Inventory failed orderId={}, userId={}, correlationId={}, reason={}",
                event.getOrderId(), event.getUserId(), event.getCorrelationId(), event.getReason());
        publishFailureCommand(event);
    }

    @RabbitListener(queues = RabbitMqConfig.PAYMENT_PROCESSED_QUEUE)
    public void handlePaymentProcessed(PaymentProcessedEvent event) {
        logger.info("Payment processed orderId={}, userId={}, correlationId={}",
                event.getOrderId(), event.getUserId(), event.getCorrelationId());

        eventPublisherService.publishFinalizeOrderCommand(new FinalizeOrderCommand(
                event.getOrderId(),
                event.getUserId(),
                event.getCorrelationId(),
                event.getCartKey(),
                event.getCustomerEmail(),
                true,
                event.getPaymentId(),
                event.getPaymentStatus(),
                event.getPaymentUrl(),
                null,
                false,
                event.getCartItems(),
                LocalDateTime.now()));
    }

    @RabbitListener(queues = RabbitMqConfig.PAYMENT_FAILED_QUEUE)
    public void handlePaymentFailed(PaymentFailedEvent event) {
        logger.warn("Payment failed orderId={}, userId={}, correlationId={}, reason={}",
                event.getOrderId(), event.getUserId(), event.getCorrelationId(), event.getReason());
        publishFailureCommand(event);
    }

    @RabbitListener(queues = RabbitMqConfig.ORDER_CONFIRMED_QUEUE)
    public void handleOrderConfirmed(OrderConfirmedEvent event) {
        logger.info("Order confirmed orderId={}, userId={}, correlationId={}",
                event.getOrderId(), event.getUserId(), event.getCorrelationId());
        eventPublisherService.publishSendNotificationCommand(new SendNotificationCommand(
                event.getOrderId(),
                event.getUserId(),
                event.getCustomerEmail(),
                event.getCorrelationId(),
                LocalDateTime.now()));
    }

    private void publishFailureCommand(PaymentFailedEvent event) {
        eventPublisherService.publishFinalizeOrderCommand(new FinalizeOrderCommand(
                event.getOrderId(),
                event.getUserId(),
                event.getCorrelationId(),
                event.getCartKey(),
                event.getCustomerEmail(),
                false,
                null,
                "FAILED",
                null,
                event.getReason(),
                event.isRefundInventory(),
                event.getCartItems(),
                LocalDateTime.now()));
    }
}
