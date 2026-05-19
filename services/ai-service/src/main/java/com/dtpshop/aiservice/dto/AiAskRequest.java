package com.dtpshop.aiservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiAskRequest(
        @NotBlank
        @Size(max = 1000)
        String question) {
}
