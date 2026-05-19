package com.dtpshop.aiservice.dto;

import java.util.List;

public record AiAskResponse(
        String answer,
        List<String> readableTables) {
}
