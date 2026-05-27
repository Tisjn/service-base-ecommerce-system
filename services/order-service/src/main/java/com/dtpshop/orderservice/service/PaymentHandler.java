package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.client.PaymentServiceClient;
import com.dtpshop.orderservice.command.ProcessPaymentCommand;
import com.dtpshop.orderservice.config.RabbitMqConfig;
import com.dtpshop.orderservice.event.PaymentFailedEvent;
import com.dtpshop.orderservice.event.PaymentProcessedEvent;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
public class PaymentHandler {

    private static final Logger logger = LoggerFactory.getLogger(PaymentHandler.class);

    private final PaymentServiceClient paymentServiceClient;
    private final EventPublisherService eventPublisherService;

    public PaymentHandler(PaymentServiceClient paymentServiceClient,
            EventPublisherService eventPublisherService) {
        this.paymentServiceClient = paymentServiceClient;
        this.eventPublisherService = eventPublisherService;
    }

    @RabbitListener(queues = RabbitMqConfig.PAYMENT_PROCESS_QUEUE)
    public void handleProcessPayment(ProcessPaymentCommand event) {
        logger.info("PaymentHandler received ProcessPayment command for orderId={}", event.getOrderId());
        PaymentServiceClient.PaymentResult result = paymentServiceClient.createPayment(event.getOrderId(),
                event.getTotalAmount(), event.getPaymentMethod(), event.getCorrelationId());
        boolean missingMomoUrl = "MOMO".equalsIgnoreCase(event.getPaymentMethod())
                && (result.getPaymentUrl() == null || result.getPaymentUrl().isBlank());
        boolean failedStatus = "FAILED".equalsIgnoreCase(result.getStatus());
        if (result.isSuccess() && !missingMomoUrl && !failedStatus) {
            PaymentProcessedEvent processedEvent = new PaymentProcessedEvent(
                    event.getOrderId(),
                    event.getUserId(),
                    result.getPaymentId(),
                    event.getCorrelationId(),
                    event.getCartItems(),
                    event.getTotalAmount(),
                    result.getStatus(),
                    result.getPaymentUrl(),
                    event.getPaymentMethod(),
                    event.getCartKey(),
                    event.getCustomerEmail(),
                    LocalDateTime.now());
            eventPublisherService.publishPaymentProcessed(processedEvent);
        } else {
            String reason = missingMomoUrl
                    ? "MoMo payment url was not created"
                    : "Payment processing failed";
            PaymentFailedEvent failedEvent = new PaymentFailedEvent(
                    event.getOrderId(),
                    event.getUserId(),
                    reason,
                    event.getCorrelationId(),
                    event.getCartItems(),
                    event.getTotalAmount(),
                    event.getCartKey(),
                    true,
                    event.getCustomerEmail(),
                    LocalDateTime.now());
            eventPublisherService.publishPaymentFailed(failedEvent);
        }
    }
}
