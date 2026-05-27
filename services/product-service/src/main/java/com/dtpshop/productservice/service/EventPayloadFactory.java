package com.dtpshop.productservice.service;

import com.dtpshop.productservice.event.ProductChangedEvent;
import com.dtpshop.productservice.model.Product;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class EventPayloadFactory {

    private final ObjectMapper objectMapper;

    public EventPayloadFactory(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String productChanged(String eventType, Product product) {
        ProductChangedEvent payload = new ProductChangedEvent(eventType, product.getId(), product);
        return serialize(payload, "product event payload");
    }

    public String categoryChanged(Integer categoryId) {
        return serialize(Map.of("categoryId", categoryId), "category event payload");
    }

    private String serialize(Object payload, String description) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize " + description, e);
        }
    }
}
