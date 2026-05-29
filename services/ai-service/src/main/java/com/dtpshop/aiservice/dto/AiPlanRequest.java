package com.dtpshop.aiservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiPlanRequest(
        @NotBlank @Size(max = 1200) String input,
        boolean dryRun) {
}
