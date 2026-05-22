package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.event.PaymentFailedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "order.saga.payment-enabled", havingValue = "true")
public class CompensationHandler {

    private static final Logger logger = LoggerFactory.getLogger(CompensationHandler.class);

    private final OrderService orderService;

    public CompensationHandler(OrderService orderService) {
        this.orderService = orderService;
    }

    @RabbitListener(queues = "saga.compensating")
    @Transactional
    public void handlePaymentFailed(PaymentFailedEvent event) {
        logger.warn("CompensationHandler received PaymentFailed for orderId={} reason={}", event.getOrderId(),
                event.getReason());
        try {
            orderService.cancelOrder(event.getOrderId(), event.getReason(), event.getCorrelationId());
            logger.info("Order cancelled and inventory refunded for orderId={}", event.getOrderId());
        } catch (Exception ex) {
            logger.error("Compensation failed for orderId={}: {}", event.getOrderId(), ex.getMessage(), ex);
        }
    }
}
