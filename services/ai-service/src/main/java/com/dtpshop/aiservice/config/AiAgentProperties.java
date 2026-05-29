package com.dtpshop.aiservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai.agent")
public record AiAgentProperties(
        String gatewayBaseUrl,
        int planTtlMinutes) {

    public AiAgentProperties {
        if (gatewayBaseUrl == null || gatewayBaseUrl.isBlank()) {
            gatewayBaseUrl = "http://localhost:8081/api";
        }
        if (planTtlMinutes <= 0) {
            planTtlMinutes = 10;
        }
    }
}
