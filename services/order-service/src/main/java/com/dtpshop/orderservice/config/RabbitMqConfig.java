package com.dtpshop.orderservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class RabbitMqConfig {

    public static final String EXCHANGE_NAME = "order.saga";
    public static final String ORDER_CREATED_QUEUE = "order.orchestrator";
    public static final String INVENTORY_RESERVE_QUEUE = "inventory.reserve";
    public static final String INVENTORY_RESERVED_QUEUE = "order.orchestrator.inventory-reserved";
    public static final String INVENTORY_FAILED_QUEUE = "order.orchestrator.inventory-failed";
    public static final String PAYMENT_PROCESS_QUEUE = "payment.process";
    public static final String PAYMENT_PROCESSED_QUEUE = "order.orchestrator.payment-processed";
    public static final String PAYMENT_FAILED_QUEUE = "order.orchestrator.payment-failed";
    public static final String ORDER_FINALIZE_QUEUE = "order.finalize";
    public static final String ORDER_CONFIRMED_QUEUE = "order.orchestrator.order-confirmed";
    public static final String NOTIFICATION_QUEUE = "notification.send";
    public static final String COMPENSATION_QUEUE = "saga.compensating";

    @Bean
    public TopicExchange orderExchange() {
        return new TopicExchange(EXCHANGE_NAME, true, false);
    }

    @Bean
    public Queue orderCreatedQueue() {
        return new Queue(ORDER_CREATED_QUEUE, true);
    }

    @Bean
    public Queue inventoryReserveQueue() {
        return new Queue(INVENTORY_RESERVE_QUEUE, true);
    }

    @Bean
    public Queue inventoryReservedQueue() {
        return new Queue(INVENTORY_RESERVED_QUEUE, true);
    }

    @Bean
    public Queue inventoryFailedQueue() {
        return new Queue(INVENTORY_FAILED_QUEUE, true);
    }

    @Bean
    public Queue paymentProcessQueue() {
        return new Queue(PAYMENT_PROCESS_QUEUE, true);
    }

    @Bean
    public Queue paymentProcessedQueue() {
        return new Queue(PAYMENT_PROCESSED_QUEUE, true);
    }

    @Bean
    public Queue paymentFailedQueue() {
        return new Queue(PAYMENT_FAILED_QUEUE, true);
    }

    @Bean
    public Queue orderFinalizeQueue() {
        return new Queue(ORDER_FINALIZE_QUEUE, true);
    }

    @Bean
    public Queue orderConfirmedQueue() {
        return new Queue(ORDER_CONFIRMED_QUEUE, true);
    }

    @Bean
    public Queue notificationQueue() {
        return new Queue(NOTIFICATION_QUEUE, true);
    }

    @Bean
    public Queue compensationQueue() {
        return new Queue(COMPENSATION_QUEUE, true);
    }

    @Bean
    public Binding orderCreatedBinding(Queue orderCreatedQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(orderCreatedQueue).to(orderExchange).with("order.created");
    }

    @Bean
    public Binding inventoryReserveBinding(Queue inventoryReserveQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(inventoryReserveQueue).to(orderExchange).with("inventory.reserve.command");
    }

    @Bean
    public Binding inventoryReservedBinding(Queue inventoryReservedQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(inventoryReservedQueue).to(orderExchange).with("inventory.reserved");
    }

    @Bean
    public Binding inventoryFailedBinding(Queue inventoryFailedQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(inventoryFailedQueue).to(orderExchange).with("inventory.failed");
    }

    @Bean
    public Binding paymentProcessBinding(Queue paymentProcessQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(paymentProcessQueue).to(orderExchange).with("payment.process.command");
    }

    @Bean
    public Binding paymentProcessedBinding(Queue paymentProcessedQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(paymentProcessedQueue).to(orderExchange).with("payment.processed");
    }

    @Bean
    public Binding paymentFailedBinding(Queue paymentFailedQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(paymentFailedQueue).to(orderExchange).with("payment.failed");
    }

    @Bean
    public Binding orderFinalizeBinding(Queue orderFinalizeQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(orderFinalizeQueue).to(orderExchange).with("order.finalize.command");
    }

    @Bean
    public Binding orderConfirmedBinding(Queue orderConfirmedQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(orderConfirmedQueue).to(orderExchange).with("order.confirmed");
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(notificationQueue).to(orderExchange).with("notification.send.command");
    }

    @Bean
    public Binding compensationBinding(Queue compensationQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(compensationQueue).to(orderExchange).with("payment.failed");
    }

    @Bean
    @Primary
    public MessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jackson2JsonMessageConverter());
        return template;
    }
}
