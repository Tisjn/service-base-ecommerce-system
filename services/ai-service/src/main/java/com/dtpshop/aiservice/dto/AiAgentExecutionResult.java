package com.dtpshop.aiservice.dto;

public record AiAgentExecutionResult(
        String tool,
        String status,
        String message,
        Object data) {
}
