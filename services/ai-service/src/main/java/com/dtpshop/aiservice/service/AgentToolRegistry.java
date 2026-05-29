package com.dtpshop.aiservice.service;

import com.dtpshop.aiservice.config.AiAgentProperties;
import com.dtpshop.aiservice.dto.AiAgentAction;
import com.dtpshop.aiservice.dto.AiAgentExecutionResult;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Service
public class AgentToolRegistry {

    private static final Set<String> ALLOWED_TOOLS = Set.of(
            "createProduct",
            "updateProduct",
            "deleteProduct",
            "restoreProduct",
            "permanentDeleteProduct",
            "createCategory",
            "updateCategory",
            "deleteCategory",
            "updateOrderStatus",
            "cancelOrder");

    private static final Set<String> PRODUCT_FIELDS = Set.of(
            "name",
            "description",
            "price",
            "purchasePrice",
            "stockQuantity",
            "categoryId",
            "status",
            "imageUrl",
            "descriptionImageUrls");

    private static final Set<String> CATEGORY_FIELDS = Set.of("name", "slug");
    private static final Set<String> ORDER_STATUSES = Set.of(
            "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED");

    private final RestClient restClient;
    private final AiAgentProperties properties;

    public AgentToolRegistry(RestClient restClient, AiAgentProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public boolean isAllowed(String tool) {
        return ALLOWED_TOOLS.contains(tool);
    }

    public AiAgentExecutionResult execute(AiAgentAction action, AgentRequestContext context) {
        try {
            Object data = switch (action.tool()) {
                case "createProduct" -> post("/products", createProductPayload(action.args()), context);
                case "updateProduct" -> patch("/products/" + requireLong(action.args(), "productId"),
                        cleanPayload(requireMap(action.args(), "payload"), PRODUCT_FIELDS), context);
                case "deleteProduct" -> delete("/products/" + requireLong(action.args(), "productId"), null, context);
                case "restoreProduct" -> patch("/products/" + requireLong(action.args(), "productId") + "/restore",
                        Map.of(), context);
                case "permanentDeleteProduct" -> permanentDeleteProduct(action.args(), context);
                case "createCategory" -> post("/categories", cleanPayload(action.args(), CATEGORY_FIELDS), context);
                case "updateCategory" -> patch("/categories/" + requireLong(action.args(), "categoryId"),
                        cleanPayload(requireMap(action.args(), "payload"), CATEGORY_FIELDS), context);
                case "deleteCategory" -> delete("/categories/" + requireLong(action.args(), "categoryId"), null, context);
                case "updateOrderStatus" -> updateOrderStatus(action.args(), context);
                case "cancelOrder" -> delete("/orders/" + requireLong(action.args(), "orderId") + "/cancel",
                        Map.of("status", String.valueOf(action.args().getOrDefault("reason", "Admin cancelled by AI agent"))),
                        context);
                default -> throw new IllegalArgumentException("Tool is not allowlisted: " + action.tool());
            };
            return new AiAgentExecutionResult(action.tool(), "success", "Tool executed", data);
        } catch (Exception ex) {
            return new AiAgentExecutionResult(action.tool(), "failed", ex.getMessage(), null);
        }
    }

    private Object post(String path, Map<String, Object> body, AgentRequestContext context) {
        return restClient.post()
                .uri(baseUrl() + path)
                .headers(headers -> addHeaders(headers, context))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Object.class);
    }

    private Object patch(String path, Map<String, Object> body, AgentRequestContext context) {
        return restClient.patch()
                .uri(baseUrl() + path)
                .headers(headers -> addHeaders(headers, context))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Object.class);
    }

    private Object get(String path, AgentRequestContext context) {
        return restClient.get()
                .uri(baseUrl() + path)
                .headers(headers -> addHeaders(headers, context))
                .retrieve()
                .body(Object.class);
    }

    private Object delete(String path, Map<String, Object> body, AgentRequestContext context) {
        RestClient.RequestBodySpec request = restClient.method(org.springframework.http.HttpMethod.DELETE)
                .uri(baseUrl() + path)
                .headers(headers -> addHeaders(headers, context));
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).body(body);
        }
        return request.retrieve().body(Object.class);
    }

    private Object permanentDeleteProduct(Map<String, Object> args, AgentRequestContext context) {
        long productId = requireLong(args, "productId");
        if (productId <= 0) {
            throw new IllegalArgumentException("productId must be greater than 0");
        }
        patch("/products/" + productId, Map.of("status", "HIDDEN"), context);
        return delete("/products/" + productId + "/permanent", null, context);
    }

    private Object updateOrderStatus(Map<String, Object> args, AgentRequestContext context) {
        long orderId = requireLong(args, "orderId");
        if (orderId <= 0) {
            throw new IllegalArgumentException("orderId must be greater than 0");
        }

        String requestedStatus = requireOrderStatus(args);
        Object order = get("/orders/" + orderId, context);
        String currentStatus = extractStatus(order);
        List<String> path = transitionPath(currentStatus, requestedStatus);
        Object result = order;
        for (String nextStatus : path) {
            result = patch("/orders/" + orderId + "/status", Map.of("status", nextStatus), context);
        }
        return result;
    }

    private String extractStatus(Object order) {
        if (order instanceof Map<?, ?> map) {
            Object status = map.get("status");
            if (status != null) {
                return String.valueOf(status).toUpperCase();
            }
        }
        throw new IllegalArgumentException("Cannot read current order status");
    }

    private List<String> transitionPath(String currentStatus, String requestedStatus) {
        String current = currentStatus == null ? "" : currentStatus.toUpperCase();
        String requested = requestedStatus == null ? "" : requestedStatus.toUpperCase();
        if (current.equals(requested)) {
            return List.of();
        }
        if ("CANCELLED".equals(requested)) {
            if ("DELIVERED".equals(current) || "CANCELLED".equals(current)) {
                throw new IllegalArgumentException("Cannot cancel order from status " + current);
            }
            return List.of("CANCELLED");
        }

        List<String> forward = List.of("PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED");
        int currentIndex = forward.indexOf(current);
        int requestedIndex = forward.indexOf(requested);
        if (currentIndex < 0 || requestedIndex < 0) {
            throw new IllegalArgumentException("Unsupported order status transition: " + current + " -> " + requested);
        }
        if (requestedIndex < currentIndex) {
            requestedIndex = Math.min(currentIndex + 1, forward.size() - 1);
        }
        if (requestedIndex == currentIndex) {
            return List.of();
        }
        return new ArrayList<>(forward.subList(currentIndex + 1, requestedIndex + 1));
    }

    private void addHeaders(HttpHeaders headers, AgentRequestContext context) {
        headers.add("X-User-Id", String.valueOf(context.userId()));
        if (StringUtils.hasText(context.userRole())) {
            headers.add("X-User-Role", context.userRole());
        }
        if (StringUtils.hasText(context.userEmail())) {
            headers.add("X-User-Email", context.userEmail());
        }
        if (StringUtils.hasText(context.authorization())) {
            headers.add(HttpHeaders.AUTHORIZATION, context.authorization());
        }
    }

    private String baseUrl() {
        return properties.gatewayBaseUrl().replaceAll("/+$", "");
    }

    private long requireLong(Map<String, Object> args, String key) {
        Object value = args.get(key);
        if (value instanceof Number number) {
            long parsed = number.longValue();
            if (parsed <= 0) {
                throw new IllegalArgumentException(key + " must be greater than 0");
            }
            return parsed;
        }
        if (value instanceof String text && text.matches("\\d+")) {
            long parsed = Long.parseLong(text);
            if (parsed <= 0) {
                throw new IllegalArgumentException(key + " must be greater than 0");
            }
            return parsed;
        }
        throw new IllegalArgumentException(key + " must be a valid numeric id");
    }

    private String requireOrderStatus(Map<String, Object> args) {
        String status = String.valueOf(args.getOrDefault("status", "")).toUpperCase();
        if (!ORDER_STATUSES.contains(status)) {
            throw new IllegalArgumentException("status must be one of " + ORDER_STATUSES);
        }
        return status;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> requireMap(Map<String, Object> args, String key) {
        Object value = args.get(key);
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        throw new IllegalArgumentException(key + " must be an object");
    }

    private Map<String, Object> cleanPayload(Map<String, Object> raw, Set<String> allowedFields) {
        Map<String, Object> cleaned = new LinkedHashMap<>();
        raw.forEach((key, value) -> {
            if (allowedFields.contains(key) && hasPayloadValue(value)) {
                cleaned.put(key, value);
            }
        });
        if (cleaned.isEmpty()) {
            throw new IllegalArgumentException("payload does not contain any allowed fields");
        }
        return cleaned;
    }

    private boolean hasPayloadValue(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof String text) {
            return !text.isBlank();
        }
        if (value instanceof List<?> list) {
            return !list.isEmpty();
        }
        if (value instanceof Map<?, ?> map) {
            return !map.isEmpty();
        }
        return true;
    }

    private Map<String, Object> createProductPayload(Map<String, Object> raw) {
        Map<String, Object> cleaned = cleanPayload(raw, PRODUCT_FIELDS);
        cleaned.putIfAbsent("price", 0);
        cleaned.putIfAbsent("purchasePrice", 0);
        cleaned.putIfAbsent("stockQuantity", 0);
        cleaned.putIfAbsent("status", "ACTIVE");
        if (!StringUtils.hasText(String.valueOf(cleaned.getOrDefault("name", "")))) {
            throw new IllegalArgumentException("name is required for createProduct");
        }
        return cleaned;
    }
}
