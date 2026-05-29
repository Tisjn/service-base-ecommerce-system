package com.dtpshop.aiservice.dto;

import java.time.Instant;
import java.util.List;

public record AiExecutionResponse(
        String planId,
        String status,
        List<String> summary,
        List<AiAgentExecutionResult> results,
        Instant executedAt) {
}
