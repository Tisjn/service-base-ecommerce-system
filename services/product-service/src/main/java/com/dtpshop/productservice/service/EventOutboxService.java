package com.dtpshop.productservice.service;

import com.dtpshop.productservice.config.RabbitMqConfig;
import com.dtpshop.productservice.model.OutboxEvent;
import com.dtpshop.productservice.model.Product;
import com.dtpshop.productservice.repository.OutboxEventRepository;
import org.springframework.stereotype.Service;

@Service
public class EventOutboxService {

    private final OutboxEventRepository outboxEventRepository;
    private final EventPayloadFactory eventPayloadFactory;

    public EventOutboxService(OutboxEventRepository outboxEventRepository, EventPayloadFactory eventPayloadFactory) {
        this.outboxEventRepository = outboxEventRepository;
        this.eventPayloadFactory = eventPayloadFactory;
    }

    public void productCreated(Product product) {
        saveProductEvent("ProductCreated", RabbitMqConfig.PRODUCT_CREATED_ROUTING_KEY, product);
    }

    public void productUpdated(Product product) {
        saveProductEvent("ProductUpdated", RabbitMqConfig.PRODUCT_UPDATED_ROUTING_KEY, product);
    }

    public void productDeleted(Product product) {
        saveProductEvent("ProductDeleted", RabbitMqConfig.PRODUCT_DELETED_ROUTING_KEY, product);
    }

    public void inventoryChanged(Product product) {
        saveProductEvent("InventoryChanged", RabbitMqConfig.INVENTORY_CHANGED_ROUTING_KEY, product);
    }

    public void categoryChanged(Integer categoryId) {
        OutboxEvent event = new OutboxEvent();
        event.setAggregateType("Category");
        event.setAggregateId(String.valueOf(categoryId));
        event.setEventType("CategoryChanged");
        event.setRoutingKey(RabbitMqConfig.CATEGORY_CHANGED_ROUTING_KEY);
        event.setPayload(eventPayloadFactory.categoryChanged(categoryId));
        outboxEventRepository.save(event);
    }

    private void saveProductEvent(String eventType, String routingKey, Product product) {
        OutboxEvent event = new OutboxEvent();
        event.setAggregateType("Product");
        event.setAggregateId(String.valueOf(product.getId()));
        event.setEventType(eventType);
        event.setRoutingKey(routingKey);
        event.setPayload(eventPayloadFactory.productChanged(eventType, product));
        outboxEventRepository.save(event);
    }
}
