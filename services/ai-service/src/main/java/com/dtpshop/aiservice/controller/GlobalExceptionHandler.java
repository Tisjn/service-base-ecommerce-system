package com.dtpshop.aiservice.controller;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Pattern RETRY_AFTER_PATTERN = Pattern.compile("retry in\\s+([0-9]+(?:\\.[0-9]+)?)s", Pattern.CASE_INSENSITIVE);

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .body(Map.of("message", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Question is required and must be under 1000 characters"));
    }

    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<Map<String, String>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(RestClientException.class)
    ResponseEntity<Map<String, Object>> handleRestClient(RestClientException ex) {
        if (ex instanceof HttpStatusCodeException statusException
                && statusException.getStatusCode().value() == 429) {
            int retryAfterSeconds = extractRetryAfterSeconds(statusException.getResponseBodyAsString());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(
                            "message", "AI đang hết lượt gọi Gemini miễn phí. Vui lòng thử lại sau khoảng "
                                    + retryAfterSeconds + " giây.",
                            "code", "AI_QUOTA_EXCEEDED",
                            "retryAfterSeconds", retryAfterSeconds));
        }

        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of(
                        "message", "Trợ lý AI đang tạm thời không phản hồi. Vui lòng thử lại sau.",
                        "code", "AI_PROVIDER_ERROR"));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "AI service failed"));
    }

    private int extractRetryAfterSeconds(String responseBody) {
        Matcher matcher = RETRY_AFTER_PATTERN.matcher(responseBody == null ? "" : responseBody);
        if (!matcher.find()) {
            return 30;
        }

        try {
            return Math.max(1, (int) Math.ceil(Double.parseDouble(matcher.group(1))));
        } catch (NumberFormatException ex) {
            return 30;
        }
    }
}
