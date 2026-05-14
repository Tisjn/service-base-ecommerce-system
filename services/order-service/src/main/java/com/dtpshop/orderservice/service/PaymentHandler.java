package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.client.PaymentServiceClient;
import com.dtpshop.orderservice.event.InventoryReservedEvent;
import com.dtpshop.orderservice.event.PaymentFailedEvent;
import com.dtpshop.orderservice.event.PaymentProcessedEvent;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "order.saga.payment-enabled", havingValue = "true")
public class PaymentHandler {

    private static final Logger logger = LoggerFactory.getLogger(PaymentHandler.class);

    private final PaymentServiceClient paymentServiceClient;
    private final EventPublisherService eventPublisherService;

    public PaymentHandler(PaymentServiceClient paymentServiceClient,
            EventPublisherService eventPublisherService) {
        this.paymentServiceClient = paymentServiceClient;
        this.eventPublisherService = eventPublisherService;
    }

    @RabbitListener(queues = "payment.process")
    public void handleInventoryReserved(InventoryReservedEvent event) {
        logger.info("PaymentHandler received InventoryReserved for orderId={}", event.getOrderId());
        PaymentServiceClient.PaymentResult result = paymentServiceClient.processPayment(event.getOrderId(),
                event.getTotalAmount(), event.getCorrelationId());
        if (result.isSuccess()) {
            PaymentProcessedEvent processedEvent = new PaymentProcessedEvent(
                    event.getOrderId(),
                    event.getUserId(),
                    result.getPaymentId(),
                    event.getCorrelationId(),
                    event.getCartItems(),
                    event.getTotalAmount(),
                    LocalDateTime.now());
            eventPublisherService.publishPaymentProcessed(processedEvent);
        } else {
            PaymentFailedEvent failedEvent = new PaymentFailedEvent(
                    event.getOrderId(),
                    event.getUserId(),
                    "Payment processing failed",
                    event.getCorrelationId(),
                    event.getCartItems(),
                    event.getTotalAmount(),
                    LocalDateTime.now());
            eventPublisherService.publishPaymentFailed(failedEvent);
        }
    }
}
