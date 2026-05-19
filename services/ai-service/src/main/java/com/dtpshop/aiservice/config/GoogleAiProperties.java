package com.dtpshop.aiservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "google.ai")
public record GoogleAiProperties(
        String apiKey,
        String model,
        String endpoint) {
}
