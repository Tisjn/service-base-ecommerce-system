package com.dtpshop.aiservice.dto;

import java.util.Map;

public record AiAgentAction(
        String tool,
        Map<String, Object> args,
        String description,
        String riskLevel) {
}
