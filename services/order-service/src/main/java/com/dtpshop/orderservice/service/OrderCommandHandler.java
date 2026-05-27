package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.client.ProductServiceClient;
import com.dtpshop.orderservice.command.FinalizeOrderCommand;
import com.dtpshop.orderservice.config.RabbitMqConfig;
import com.dtpshop.orderservice.event.OrderConfirmedEvent;
import com.dtpshop.orderservice.model.Order;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
public class OrderCommandHandler {

    private static final Logger logger = LoggerFactory.getLogger(OrderCommandHandler.class);

    private final OrderService orderService;
    private final CartService cartService;
    private final ProductServiceClient productServiceClient;
    private final EventPublisherService eventPublisherService;

    public OrderCommandHandler(OrderService orderService,
            CartService cartService,
            ProductServiceClient productServiceClient,
            EventPublisherService eventPublisherService) {
        this.orderService = orderService;
        this.cartService = cartService;
        this.productServiceClient = productServiceClient;
        this.eventPublisherService = eventPublisherService;
    }

    @RabbitListener(queues = RabbitMqConfig.ORDER_FINALIZE_QUEUE)
    public void handleFinalizeOrder(FinalizeOrderCommand command) {
        logger.info("OrderCommandHandler received FinalizeOrder command for orderId={}, successful={}",
                command.getOrderId(), command.isSuccessful());

        if (command.isSuccessful()) {
            Order confirmedOrder = orderService.confirmOrder(
                    command.getOrderId(),
                    command.getPaymentId(),
                    command.getPaymentStatus(),
                    command.getPaymentUrl());
            cartService.removeItems(command.getCartKey(), command.getCartItems());
            eventPublisherService.publishOrderConfirmed(new OrderConfirmedEvent(
                    confirmedOrder.getId(),
                    confirmedOrder.getUserId(),
                    command.getCustomerEmail(),
                    command.getCorrelationId(),
                    LocalDateTime.now()));
            return;
        }

        if (command.isRefundInventory()) {
            productServiceClient.refundInventory(command.getCartItems(), command.getCorrelationId());
        }
        orderService.failOrder(command.getOrderId(), command.getFailureReason(), command.getCorrelationId());
    }
}
