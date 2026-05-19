package com.dtpshop.aiservice.controller;

import com.dtpshop.aiservice.dto.AiAskRequest;
import com.dtpshop.aiservice.dto.AiAskResponse;
import com.dtpshop.aiservice.dto.AiSummaryResponse;
import com.dtpshop.aiservice.service.AiAssistantService;
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

    public AiController(AiAssistantService aiAssistantService) {
        this.aiAssistantService = aiAssistantService;
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
