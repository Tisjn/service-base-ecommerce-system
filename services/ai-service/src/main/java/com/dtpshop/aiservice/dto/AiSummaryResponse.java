package com.dtpshop.aiservice.dto;

import java.util.List;
import java.util.Map;

public record AiSummaryResponse(
        List<Map<String, Object>> categories,
        List<Map<String, Object>> products,
        List<Map<String, Object>> orders,
        List<Map<String, Object>> orderItems,
        List<Map<String, Object>> faqPolicy) {
}
