package com.dtpshop.aiservice.service;

import com.dtpshop.aiservice.dto.AiAgentExecutionResult;
import com.dtpshop.aiservice.dto.AiHistoryItem;
import com.dtpshop.aiservice.dto.AiPlanResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class AgentAuditService {

    private final Map<String, AiHistoryItem> history = new ConcurrentHashMap<>();

    public void recordPlan(AgentRequestContext context, String input, AiPlanResponse plan) {
        history.put(plan.planId(), new AiHistoryItem(
                plan.planId(),
                context.userId(),
                context.userEmail(),
                input,
                plan.status(),
                plan.riskLevel(),
                plan.summary(),
                plan.actions(),
                List.of(),
                Instant.now(),
                null));
    }

    public void recordExecution(String planId, String status, List<AiAgentExecutionResult> results) {
        AiHistoryItem existing = history.get(planId);
        if (existing == null) {
            return;
        }
        history.put(planId, new AiHistoryItem(
                existing.planId(),
                existing.userId(),
                existing.userEmail(),
                existing.input(),
                status,
                existing.riskLevel(),
                existing.summary(),
                existing.actions(),
                results,
                existing.createdAt(),
                Instant.now()));
    }

    public List<AiHistoryItem> latestForUser(long userId) {
        return history.values().stream()
                .filter(item -> item.userId() == userId)
                .sorted(Comparator.comparing(AiHistoryItem::createdAt).reversed())
                .limit(30)
                .toList();
    }

    public List<AiHistoryItem> latestAll() {
        return new ArrayList<>(history.values()).stream()
                .sorted(Comparator.comparing(AiHistoryItem::createdAt).reversed())
                .limit(50)
                .toList();
    }
}
