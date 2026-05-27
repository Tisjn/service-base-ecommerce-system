package com.dtpshop.productservice.config;

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

@Configuration
public class RabbitMqConfig {

    public static final String EXCHANGE_NAME = "product.events";
    public static final String PRODUCT_PROJECTION_QUEUE = "product.projection";

    public static final String PRODUCT_CREATED_ROUTING_KEY = "product.created";
    public static final String PRODUCT_UPDATED_ROUTING_KEY = "product.updated";
    public static final String PRODUCT_DELETED_ROUTING_KEY = "product.deleted";
    public static final String INVENTORY_CHANGED_ROUTING_KEY = "product.inventory.changed";
    public static final String CATEGORY_CHANGED_ROUTING_KEY = "product.category.changed";

    @Bean
    public TopicExchange productExchange() {
        return new TopicExchange(EXCHANGE_NAME, true, false);
    }

    @Bean
    public Queue productProjectionQueue() {
        return new Queue(PRODUCT_PROJECTION_QUEUE, true);
    }

    @Bean
    public Binding productProjectionBinding(Queue productProjectionQueue, TopicExchange productExchange) {
        return BindingBuilder.bind(productProjectionQueue).to(productExchange).with("product.#");
    }

    @Bean
    public MessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }
}
