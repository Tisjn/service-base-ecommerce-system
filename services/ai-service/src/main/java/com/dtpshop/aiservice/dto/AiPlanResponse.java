package com.dtpshop.aiservice.dto;

import java.time.Instant;
import java.util.List;

public record AiPlanResponse(
        String planId,
        boolean needsConfirmation,
        String riskLevel,
        String status,
        List<String> summary,
        List<AiAgentAction> actions,
        List<String> warnings,
        Instant expiresAt) {
}
