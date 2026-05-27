package com.dtpshop.productservice.service;

import com.dtpshop.productservice.config.RabbitMqConfig;
import com.dtpshop.productservice.event.ProductChangedEvent;
import com.dtpshop.productservice.model.OutboxEvent;
import com.dtpshop.productservice.model.OutboxEventStatus;
import com.dtpshop.productservice.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventPublisherWorker {

    private static final Logger logger = LoggerFactory.getLogger(EventPublisherWorker.class);

    private final OutboxEventRepository outboxEventRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public EventPublisherWorker(OutboxEventRepository outboxEventRepository, RabbitTemplate rabbitTemplate,
            ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelayString = "${product.outbox.publisher-delay-ms:3000}")
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> events = outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc(OutboxEventStatus.PENDING);
        for (OutboxEvent event : events) {
            publish(event);
        }
    }

    private void publish(OutboxEvent event) {
        try {
            Object payload = event.getPayload();
            if ("Product".equals(event.getAggregateType())) {
                payload = objectMapper.readValue(event.getPayload(), ProductChangedEvent.class);
            }
            rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, event.getRoutingKey(), payload);
            event.setStatus(OutboxEventStatus.PUBLISHED);
            event.setPublishedAt(Instant.now());
            event.setLastError(null);
            logger.info("Published outbox event id={} type={}", event.getId(), event.getEventType());
        } catch (Exception e) {
            event.setAttempts(event.getAttempts() + 1);
            event.setLastError(e.getMessage());
            if (event.getAttempts() >= 5) {
                event.setStatus(OutboxEventStatus.FAILED);
            }
            logger.warn("Failed to publish outbox event id={} attempt={}: {}", event.getId(), event.getAttempts(),
                    e.getMessage());
        }
    }
}
