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

    public static final String EXCHANGE_NAME = "order.events";
    public static final String ORDER_CREATED_QUEUE = "inventory.reserve";
    public static final String PAYMENT_PROCESS_QUEUE = "payment.process";
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
    public Queue paymentProcessQueue() {
        return new Queue(PAYMENT_PROCESS_QUEUE, true);
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
    public Binding paymentProcessBinding(Queue paymentProcessQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(paymentProcessQueue).to(orderExchange).with("inventory.reserved");
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(notificationQueue).to(orderExchange).with("payment.processed");
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
