package com.dtpshop.aiservice.controller;

import com.dtpshop.aiservice.dto.AiAskRequest;
import com.dtpshop.aiservice.dto.AiAskResponse;
import com.dtpshop.aiservice.dto.AiConfirmRequest;
import com.dtpshop.aiservice.dto.AiExecutionResponse;
import com.dtpshop.aiservice.dto.AiHistoryItem;
import com.dtpshop.aiservice.dto.AiPlanRequest;
import com.dtpshop.aiservice.dto.AiPlanResponse;
import com.dtpshop.aiservice.dto.AiSummaryResponse;
import com.dtpshop.aiservice.service.AgentAuditService;
import com.dtpshop.aiservice.service.AgentPlanService;
import com.dtpshop.aiservice.service.AgentRequestContext;
import com.dtpshop.aiservice.service.AiAssistantService;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/api/ai", "/api/admin/ai"})
public class AiController {

    private final AiAssistantService aiAssistantService;
    private final AgentPlanService agentPlanService;
    private final AgentAuditService agentAuditService;

    public AiController(
            AiAssistantService aiAssistantService,
            AgentPlanService agentPlanService,
            AgentAuditService agentAuditService) {
        this.aiAssistantService = aiAssistantService;
        this.agentPlanService = agentPlanService;
        this.agentAuditService = agentAuditService;
    }

    @PostMapping("/ask")
    public ResponseEntity<AiAskResponse> ask(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @Valid @RequestBody AiAskRequest request) {
        long userId = requireUserId(userIdHeader);
        return ResponseEntity.ok(aiAssistantService.ask(userId, request.question()));
    }

    @GetMapping("/summary")
    public ResponseEntity<AiSummaryResponse> summary(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        long userId = requireUserId(userIdHeader);
        return ResponseEntity.ok(aiAssistantService.summary(userId));
    }

    @PostMapping("/plan")
    public ResponseEntity<AiPlanResponse> plan(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody AiPlanRequest request) {
        AgentRequestContext context = new AgentRequestContext(
                requireUserId(userIdHeader),
                userRole,
                userEmail,
                authorization);
        return ResponseEntity.ok(agentPlanService.plan(context, request.input()));
    }

    @PostMapping("/confirm")
    public ResponseEntity<AiExecutionResponse> confirm(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody AiConfirmRequest request) {
        AgentRequestContext context = new AgentRequestContext(
                requireUserId(userIdHeader),
                userRole,
                userEmail,
                authorization);
        return ResponseEntity.ok(agentPlanService.confirm(context, request.planId(), request.confirm(), request.actions()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<AiHistoryItem>> history(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        long userId = requireUserId(userIdHeader);
        if (userRole != null && userRole.toUpperCase().contains("ADMIN")) {
            return ResponseEntity.ok(agentAuditService.latestAll());
        }
        return ResponseEntity.ok(agentAuditService.latestForUser(userId));
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok().body(new HealthResponse("ok", "ai-service"));
    }

    private long requireUserId(String userIdHeader) {
        if (!StringUtils.hasText(userIdHeader)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing X-User-Id");
        }

        try {
            return Long.parseLong(userIdHeader.trim());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid X-User-Id");
        }
    }

    private record HealthResponse(String status, String service) {
    }
}
