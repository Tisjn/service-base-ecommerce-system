package com.dtpshop.productservice.service;

import com.dtpshop.productservice.config.RabbitMqConfig;
import com.dtpshop.productservice.event.ProductChangedEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
public class ProductProjectionUpdater {

    private static final Logger logger = LoggerFactory.getLogger(ProductProjectionUpdater.class);

    private final ProductCacheService productCacheService;
    private final ObjectMapper objectMapper;

    public ProductProjectionUpdater(ProductCacheService productCacheService, ObjectMapper objectMapper) {
        this.productCacheService = productCacheService;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = RabbitMqConfig.PRODUCT_PROJECTION_QUEUE)
    public void handleProductEvent(Message message) {
        try {
            String routingKey = message.getMessageProperties().getReceivedRoutingKey();
            if (RabbitMqConfig.CATEGORY_CHANGED_ROUTING_KEY.equals(routingKey)) {
                productCacheService.clearProductLists();
                productCacheService.clearProductDetails();
                logger.info("Cleared Redis product read model after category change");
                return;
            }

            ProductChangedEvent event = readProductEvent(message);
            productCacheService.clearProductLists();
            if ("ProductDeleted".equals(event.getEventType())) {
                productCacheService.evictProductDetail(event.getProductId());
            } else {
                productCacheService.putProductDetail(event.getProductId(), event.getProduct());
            }
            logger.info("Updated Redis read model for productId={} eventType={}", event.getProductId(),
                    event.getEventType());
        } catch (RuntimeException e) {
            logger.warn("Skipped Redis projection update because cache is unavailable: {}", e.getMessage());
        }
    }

    private ProductChangedEvent readProductEvent(Message message) {
        try {
            return objectMapper.readValue(message.getBody(), ProductChangedEvent.class);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot read product projection event", e);
        }
    }
}
