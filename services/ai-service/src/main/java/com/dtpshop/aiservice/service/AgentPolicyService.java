package com.dtpshop.aiservice.service;

import com.dtpshop.aiservice.dto.AiAgentAction;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AgentPolicyService {

    private static final Set<String> HIGH_RISK_TOOLS = Set.of(
            "deleteProduct",
            "permanentDeleteProduct",
            "deleteCategory",
            "updateOrderStatus",
            "cancelOrder");

    public void requireAdmin(AgentRequestContext context) {
        if (!context.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role is required for AI agent actions");
        }
    }

    public boolean needsConfirmation(List<AiAgentAction> actions) {
        return actions.stream().anyMatch(action -> !"low".equalsIgnoreCase(action.riskLevel()));
    }

    public String riskLevel(List<AiAgentAction> actions) {
        if (actions.stream().anyMatch(action -> "high".equalsIgnoreCase(action.riskLevel())
                || HIGH_RISK_TOOLS.contains(action.tool()))) {
            return "high";
        }
        if (actions.stream().anyMatch(action -> "medium".equalsIgnoreCase(action.riskLevel()))) {
            return "medium";
        }
        return "low";
    }

    public void requireConfirmed(boolean confirmed) {
        if (!confirmed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan must be confirmed before execution");
        }
    }
}
