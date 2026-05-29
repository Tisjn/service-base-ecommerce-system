package com.dtpshop.aiservice.dto;

import java.time.Instant;
import java.util.List;

public record AiHistoryItem(
        String planId,
        long userId,
        String userEmail,
        String input,
        String status,
        String riskLevel,
        List<String> summary,
        List<AiAgentAction> actions,
        List<AiAgentExecutionResult> results,
        Instant createdAt,
        Instant executedAt) {
}
