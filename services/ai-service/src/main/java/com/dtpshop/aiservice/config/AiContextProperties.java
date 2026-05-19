package com.dtpshop.aiservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai.context")
public record AiContextProperties(
        int productLimit,
        int orderLimit,
        int faqLimit) {
}
