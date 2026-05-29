package com.dtpshop.aiservice.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record AiConfirmRequest(
        @NotBlank String planId,
        boolean confirm,
        List<AiAgentAction> actions) {
}
