package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.client.ProductServiceClient;
import com.dtpshop.orderservice.command.ReserveInventoryCommand;
import com.dtpshop.orderservice.config.RabbitMqConfig;
import com.dtpshop.orderservice.event.InventoryReservedEvent;
import com.dtpshop.orderservice.event.PaymentFailedEvent;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
public class InventoryHandler {

    private static final Logger logger = LoggerFactory.getLogger(InventoryHandler.class);

    private final ProductServiceClient productServiceClient;
    private final EventPublisherService eventPublisherService;

    public InventoryHandler(ProductServiceClient productServiceClient,
            EventPublisherService eventPublisherService) {
        this.productServiceClient = productServiceClient;
        this.eventPublisherService = eventPublisherService;
    }

    @RabbitListener(queues = RabbitMqConfig.INVENTORY_RESERVE_QUEUE)
    public void handleReserveInventory(ReserveInventoryCommand event) {
        logger.info("InventoryHandler received ReserveInventory command for orderId={}", event.getOrderId());
        boolean reserved = productServiceClient.reserveInventory(event.getCartItems(), event.getCorrelationId());
        if (reserved) {
            InventoryReservedEvent reservedEvent = new InventoryReservedEvent(
                    event.getOrderId(),
                    event.getUserId(),
                    event.getCorrelationId(),
                    event.getCartItems(),
                    event.getTotalAmount(),
                    event.getPaymentMethod(),
                    event.getCartKey(),
                    event.getCustomerEmail(),
                    LocalDateTime.now());
            eventPublisherService.publishInventoryReserved(reservedEvent);
        } else {
            PaymentFailedEvent failedEvent = new PaymentFailedEvent(
                    event.getOrderId(),
                    event.getUserId(),
                    "Inventory reservation failed",
                    event.getCorrelationId(),
                    event.getCartItems(),
                    event.getTotalAmount(),
                    event.getCartKey(),
                    false,
                    event.getCustomerEmail(),
                    LocalDateTime.now());
            eventPublisherService.publishInventoryFailed(failedEvent);
        }
    }
}
