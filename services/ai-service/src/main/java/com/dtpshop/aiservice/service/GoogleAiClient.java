package com.dtpshop.aiservice.service;

import com.dtpshop.aiservice.config.GoogleAiProperties;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Service
public class GoogleAiClient {

    private final RestClient restClient;
    private final GoogleAiProperties properties;

    public GoogleAiClient(RestClient restClient, GoogleAiProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public String generate(String prompt) {
        if (!StringUtils.hasText(properties.apiKey())) {
            throw new IllegalStateException("GOOGLE_AI_API_KEY is not configured");
        }

        String url = String.format("%s/models/%s:generateContent",
                trimTrailingSlash(properties.endpoint()),
                properties.model());

        Map<String, Object> request = Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.3,
                        "topP", 0.8,
                        "maxOutputTokens", 1024));

        Map<?, ?> response = restClient.post()
                .uri(url)
                .header("x-goog-api-key", properties.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(Map.class);

        return extractText(response);
    }

    private String extractText(Map<?, ?> response) {
        Object candidatesValue = response == null ? null : response.get("candidates");
        if (!(candidatesValue instanceof List<?> candidates) || candidates.isEmpty()) {
            return "Xin loi, minh chua tao duoc cau tra loi tu AI luc nay.";
        }

        Object firstCandidate = candidates.getFirst();
        if (!(firstCandidate instanceof Map<?, ?> candidate)) {
            return "Xin loi, minh chua doc duoc phan hoi tu AI.";
        }

        Object contentValue = candidate.get("content");
        if (!(contentValue instanceof Map<?, ?> content)) {
            return "Xin loi, phan hoi AI khong co noi dung phu hop.";
        }

        Object partsValue = content.get("parts");
        if (!(partsValue instanceof List<?> parts)) {
            return "Xin loi, phan hoi AI khong co noi dung phu hop.";
        }

        StringBuilder answer = new StringBuilder();
        for (Object partValue : parts) {
            if (partValue instanceof Map<?, ?> part && part.get("text") instanceof String text) {
                answer.append(text);
            }
        }

        return answer.isEmpty()
                ? "Xin loi, minh chua co cau tra loi phu hop."
                : answer.toString().trim();
    }

    private String trimTrailingSlash(String value) {
        return StringUtils.hasText(value) ? value.replaceAll("/+$", "") : "";
    }
}
