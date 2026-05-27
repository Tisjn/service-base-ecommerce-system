package com.dtpshop.productservice.event;

import com.dtpshop.productservice.model.Product;
import java.time.Instant;
import java.util.UUID;

public class ProductChangedEvent {

    private String eventId;
    private String eventType;
    private Long productId;
    private Product product;
    private Instant occurredAt;

    public ProductChangedEvent() {
    }

    public ProductChangedEvent(String eventType, Long productId, Product product) {
        this.eventId = UUID.randomUUID().toString();
        this.eventType = eventType;
        this.productId = productId;
        this.product = product;
        this.occurredAt = Instant.now();
    }

    public String getEventId() {
        return eventId;
    }

    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }
}
