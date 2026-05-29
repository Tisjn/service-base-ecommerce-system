package com.dtpshop.aiservice.service;

import com.dtpshop.aiservice.config.AiAgentProperties;
import com.dtpshop.aiservice.dto.AiAgentAction;
import com.dtpshop.aiservice.dto.AiAgentExecutionResult;
import com.dtpshop.aiservice.dto.AiExecutionResponse;
import com.dtpshop.aiservice.dto.AiPlanResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.text.Normalizer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AgentPlanService {

    private final GoogleAiClient googleAiClient;
    private final EcommerceContextService contextService;
    private final ObjectMapper objectMapper;
    private final AgentToolRegistry toolRegistry;
    private final AgentPolicyService policyService;
    private final AgentAuditService auditService;
    private final AiAgentProperties properties;
    private final Map<String, StoredPlan> plans = new ConcurrentHashMap<>();

    public AgentPlanService(
            GoogleAiClient googleAiClient,
            EcommerceContextService contextService,
            ObjectMapper objectMapper,
            AgentToolRegistry toolRegistry,
            AgentPolicyService policyService,
            AgentAuditService auditService,
            AiAgentProperties properties) {
        this.googleAiClient = googleAiClient;
        this.contextService = contextService;
        this.objectMapper = objectMapper;
        this.toolRegistry = toolRegistry;
        this.policyService = policyService;
        this.auditService = auditService;
        this.properties = properties;
    }

    public AiPlanResponse plan(AgentRequestContext context, String input) {
        policyService.requireAdmin(context);
        EcommerceContext ecommerceContext = contextService.loadForUser(context.userId());
        List<AiAgentAction> actions = buildActions(input, ecommerceContext);
        if (actions.isEmpty()) {
            actions = draftActions(input, ecommerceContext);
        }

        List<String> warnings = validateActions(actions);
        String riskLevel = policyService.riskLevel(actions);
        Instant expiresAt = Instant.now().plus(properties.planTtlMinutes(), ChronoUnit.MINUTES);
        AiPlanResponse response = new AiPlanResponse(
                "apl_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12),
                policyService.needsConfirmation(actions),
                riskLevel,
                warnings.isEmpty() ? "planned" : "needs_review",
                actions.stream().map(AiAgentAction::description).toList(),
                actions,
                warnings,
                expiresAt);

        plans.put(response.planId(), new StoredPlan(context.userId(), input, response));
        auditService.recordPlan(context, input, response);
        return response;
    }

    public AiExecutionResponse confirm(
            AgentRequestContext context,
            String planId,
            boolean confirm,
            List<AiAgentAction> editedActions) {
        policyService.requireAdmin(context);
        policyService.requireConfirmed(confirm);
        StoredPlan storedPlan = plans.get(planId);
        if (storedPlan == null || storedPlan.response().expiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "Plan is missing or expired");
        }
        if (storedPlan.userId() != context.userId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Plan belongs to another user");
        }
        List<AiAgentAction> actionsToExecute = editedActions == null || editedActions.isEmpty()
                ? storedPlan.response().actions()
                : editedActions;
        EcommerceContext ecommerceContext = contextService.loadForUser(context.userId());
        actionsToExecute = prepareActionsForExecution(actionsToExecute, storedPlan.input(), ecommerceContext);
        List<String> warnings = validateActions(actionsToExecute);
        if (!storedPlan.response().warnings().isEmpty() || !warnings.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan has validation warnings and cannot be executed");
        }

        List<AiAgentExecutionResult> results = actionsToExecute.stream()
                .map(action -> toolRegistry.execute(action, context))
                .toList();
        String status = results.stream().allMatch(result -> "success".equals(result.status()))
                ? "executed"
                : "partial_failed";
        auditService.recordExecution(planId, status, results);
        return new AiExecutionResponse(planId, status, storedPlan.response().summary(), results, Instant.now());
    }

    private List<AiAgentAction> buildActions(String input, EcommerceContext context) {
        try {
            String raw = googleAiClient.generate(buildPlannerPrompt(input, context));
            List<AiAgentAction> actions = parseAiActions(raw);
            if (!actions.isEmpty()) {
                return prepareActionsForExecution(normalizeCreateProductActions(actions, input, context), input, context);
            }
        } catch (Exception ignored) {
            // A small deterministic fallback keeps the demo usable when Gemini is not configured.
        }
        return fallbackActions(input, context);
    }

    private String buildPlannerPrompt(String input, EcommerceContext context) {
        return """
                Ban la Intent Planner cho admin DTPShop. Chi tra ve JSON hop le, khong markdown.
                Tao action plan voi schema:
                {"actions":[{"tool":"updateProduct","args":{"productId":1,"payload":{"price":199000}},"description":"Cap nhat gia product #1","riskLevel":"medium"}]}

                Tool allowlist:
                createProduct args: name, description, price, purchasePrice, stockQuantity, categoryId, status, imageUrl
                updateProduct args: productId, payload
                deleteProduct args: productId
                restoreProduct args: productId
                permanentDeleteProduct args: productId
                createCategory args: name, slug
                updateCategory args: categoryId, payload
                deleteCategory args: categoryId
                updateOrderStatus args: orderId, status
                cancelOrder args: orderId, reason

                Risk: low cho create/restore, medium cho update, high cho delete/cancel/order status.
                Neu khong chac id hoac tool thi actions rong.

                Yeu cau admin: %s

                Context rut gon JSON:
                %s
                """.formatted(input, toJson(context));
    }

    private List<AiAgentAction> parseAiActions(String raw) throws JsonProcessingException {
        String json = raw.replace("```json", "").replace("```", "").trim();
        int start = json.indexOf('{');
        int end = json.lastIndexOf('}');
        if (start >= 0 && end > start) {
            json = json.substring(start, end + 1);
        }
        Object root = objectMapper.readValue(json, Object.class);
        Object actionsValue = root instanceof Map<?, ?> parsed
                ? firstPresent(parsed, "actions", "actionPlan", "steps")
                : root;
        List<?> rawActions;
        if (actionsValue instanceof List<?> list) {
            rawActions = list;
        } else {
            if (actionsValue instanceof Map<?, ?> singleAction) {
                rawActions = List.of(singleAction);
            } else {
                return List.of();
            }
        }

        List<AiAgentAction> actions = new ArrayList<>();
        for (Object rawAction : rawActions) {
            if (!(rawAction instanceof Map<?, ?> map)) {
                continue;
            }
            String tool = stringValue(map, "tool", "");
            Map<String, Object> args = normalizeMap(map.get("args"));
            String description = stringValue(map, "description", tool);
            String risk = stringValue(map, "riskLevel", "medium").toLowerCase(Locale.ROOT);
            actions.add(new AiAgentAction(tool, args, description, risk));
        }
        return actions;
    }

    private Object firstPresent(Map<?, ?> map, String... keys) {
        for (String key : keys) {
            Object value = map.get(key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String stringValue(Map<?, ?> map, String key, String fallback) {
        Object value = map.get(key);
        return value == null ? fallback : String.valueOf(value);
    }

    private List<String> validateActions(List<AiAgentAction> actions) {
        List<String> warnings = new ArrayList<>();
        for (AiAgentAction action : actions) {
            if (!toolRegistry.isAllowed(action.tool())) {
                warnings.add("Tool is not allowlisted: " + action.tool());
            }
            if (action.args() == null || action.args().isEmpty()) {
                warnings.add("Missing arguments for " + action.tool());
            }
            if (needsProductId(action.tool()) && !hasPositiveId(action.args(), "productId")) {
                warnings.add("Missing valid productId for " + action.tool());
            }
            if ("updateOrderStatus".equals(action.tool()) && !hasPositiveId(action.args(), "orderId")) {
                warnings.add("Missing valid orderId for updateOrderStatus");
            }
            if ("cancelOrder".equals(action.tool()) && !hasPositiveId(action.args(), "orderId")) {
                warnings.add("Missing valid orderId for cancelOrder");
            }
        }
        return warnings;
    }

    private boolean needsProductId(String tool) {
        return List.of("updateProduct", "deleteProduct", "restoreProduct", "permanentDeleteProduct").contains(tool);
    }

    private boolean hasPositiveId(Map<String, Object> args, String key) {
        if (args == null) {
            return false;
        }
        Object value = args.get(key);
        if (value instanceof Number number) {
            return number.longValue() > 0;
        }
        return value instanceof String text && text.matches("\\d+") && Long.parseLong(text) > 0;
    }

    private List<AiAgentAction> prepareActionsForExecution(
            List<AiAgentAction> actions,
            String input,
            EcommerceContext context) {
        return actions.stream()
                .map(action -> resolveProductIdForAction(action, input, context))
                .toList();
    }

    private AiAgentAction resolveProductIdForAction(AiAgentAction action, String input, EcommerceContext context) {
        if (!needsProductId(action.tool())) {
            return action;
        }
        if (hasPositiveId(action.args(), "productId") && hasExplicitProductId(input)) {
            return action;
        }
        Long productId = resolveProductId(input, context);
        if (productId == null && extractTargetProductName(input).isBlank()) {
            return action;
        }
        Map<String, Object> args = new LinkedHashMap<>(action.args() == null ? Map.of() : action.args());
        args.put("productId", productId == null ? 0 : productId);
        return new AiAgentAction(action.tool(), args, action.description(), action.riskLevel());
    }

    private List<AiAgentAction> normalizeCreateProductActions(
            List<AiAgentAction> actions,
            String input,
            EcommerceContext context) {
        return actions.stream().map(action -> {
            if ("updateProduct".equals(action.tool())) {
                return normalizeUpdateProductAction(action, input);
            }
            if (!"createProduct".equals(action.tool())) {
                return action;
            }

            Map<String, Object> args = new LinkedHashMap<>(action.args() == null ? Map.of() : action.args());
            String currentName = String.valueOf(args.getOrDefault("name", ""));
            if (!isCleanProductName(currentName)) {
                args.put("name", extractName(input, "Sản phẩm mới"));
            }
            args.putIfAbsent("description", extractDescription(input));
            args.putIfAbsent("price", valueOrZero(extractIntegerAfter(input, "gia", "price")));
            args.putIfAbsent("purchasePrice", valueOrZero(extractIntegerAfter(input, "gia nhap", "purchase price", "purchaseprice")));
            args.putIfAbsent("stockQuantity", valueOrZero(extractIntegerAfter(input, "ton kho", "so luong", "stock", "quantity")));
            args.putIfAbsent("status", "ACTIVE");
            args.putIfAbsent("imageUrl", defaultImageUrl(input));
            if (!hasValue(args.get("categoryId"))) {
                Integer categoryId = inferCategoryId(input, context);
                if (categoryId != null) {
                    args.put("categoryId", categoryId);
                }
            }

            return new AiAgentAction(
                    action.tool(),
                    args,
                    "Tạo sản phẩm mới \"" + args.get("name") + "\"",
                    action.riskLevel());
        }).toList();
    }

    private AiAgentAction normalizeUpdateProductAction(AiAgentAction action, String input) {
        Map<String, Object> args = new LinkedHashMap<>(action.args() == null ? Map.of() : action.args());
        Map<String, Object> payload = normalizeMap(args.get("payload"));
        for (String field : List.of("name", "description", "price", "purchasePrice", "stockQuantity",
                "categoryId", "status", "imageUrl", "descriptionImageUrls")) {
            if (args.containsKey(field) && !payload.containsKey(field)) {
                payload.put(field, args.remove(field));
            }
        }
        if (!isProductStatusUpdateRequested(input)) {
            payload.remove("status");
        }
        args.put("payload", payload);
        return new AiAgentAction(action.tool(), args, action.description(), action.riskLevel());
    }

    private boolean isCleanProductName(String name) {
        String normalized = normalizeText(name);
        return !normalized.isBlank()
                && !containsAny(normalized, "so luong", "gia", "gia nhap", "danh muc", "loai", "category", "ton kho");
    }

    private boolean hasValue(Object value) {
        return value != null && !String.valueOf(value).isBlank();
    }

    private List<AiAgentAction> fallbackActions(String input, EcommerceContext context) {
        String text = normalizeText(input);
        Long firstId = firstNumber(input);
        Long resolvedProductId = resolveProductId(input, context);

        if (containsAll(text, "tao", "san pham")
                || containsAll(text, "them", "san pham")
                || containsAll(text, "create", "product")) {
            Map<String, Object> args = new LinkedHashMap<>();
            args.put("name", extractName(input, "Sản phẩm mới"));
            args.put("description", extractDescription(input));
            args.put("price", valueOrZero(extractIntegerAfter(input, "gia", "price")));
            args.put("purchasePrice", valueOrZero(extractIntegerAfter(input, "gia nhap", "purchase price", "purchaseprice")));
            args.put("stockQuantity", valueOrZero(extractIntegerAfter(input, "ton kho", "so luong", "stock", "quantity")));
            Integer categoryId = extractIntegerAfter(input, "danh muc", "category");
            if (categoryId == null) {
                categoryId = inferCategoryId(input, context);
            }
            if (categoryId != null) {
                args.put("categoryId", categoryId);
            }
            args.put("status", "ACTIVE");
            args.put("imageUrl", defaultImageUrl(input));
            return List.of(new AiAgentAction(
                    "createProduct",
                    args,
                    "Tạo sản phẩm mới \"" + args.get("name") + "\"",
                    "low"));
        }

        if (containsAll(text, "tao", "danh muc")
                || containsAll(text, "them", "danh muc")
                || containsAll(text, "create", "category")) {
            String name = extractName(input, "Danh mục mới");
            return List.of(new AiAgentAction(
                    "createCategory",
                    Map.of("name", name, "slug", slugify(name)),
                    "Tạo danh mục \"" + name + "\"",
                    "low"));
        }

        if (firstId == null && resolvedProductId != null
                && containsAny(text, "xoa vinh vien", "xoa han", "permanent delete", "delete permanently")) {
            return List.of(
                    new AiAgentAction(
                            "updateProduct",
                            Map.of("productId", resolvedProductId, "payload", Map.of("status", "HIDDEN")),
                            "Ẩn sản phẩm #" + resolvedProductId + " trước khi xóa vĩnh viễn",
                            "high"),
                    new AiAgentAction(
                            "permanentDeleteProduct",
                            Map.of("productId", resolvedProductId),
                            "Xóa vĩnh viễn sản phẩm #" + resolvedProductId,
                            "high"));
        }

        if (firstId == null && resolvedProductId != null
                && containsAny(text, "an san pham", "xoa san pham", "delete product", "hide product")) {
            return List.of(new AiAgentAction(
                    "deleteProduct",
                    Map.of("productId", resolvedProductId),
                    "Ẩn sản phẩm #" + resolvedProductId,
                    "high"));
        }

        if (firstId == null && resolvedProductId != null && containsAny(text, "khoi phuc", "restore")) {
            return List.of(new AiAgentAction(
                    "restoreProduct",
                    Map.of("productId", resolvedProductId),
                    "Khôi phục sản phẩm #" + resolvedProductId,
                    "low"));
        }

        if (firstId == null && resolvedProductId != null
                && containsAny(text, "cap nhat san pham", "sua san pham", "doi gia", "update product")) {
            Map<String, Object> payload = productUpdatePayload(input, text);
            if (!payload.isEmpty()) {
                return List.of(new AiAgentAction(
                        "updateProduct",
                        Map.of("productId", resolvedProductId, "payload", payload),
                        "Cập nhật sản phẩm #" + resolvedProductId,
                        "medium"));
            }
        }

        if (containsAny(text, "xoa vinh vien", "xoa han", "permanent delete", "delete permanently")) {
            Long productId = selectProductId(input, firstId, resolvedProductId);
            if (productId == null) {
                return List.of(new AiAgentAction(
                        "permanentDeleteProduct",
                        Map.of("productId", 0),
                        "Xóa vĩnh viễn sản phẩm, cần nhập ID sản phẩm",
                        "high"));
            }
            return List.of(
                    new AiAgentAction(
                            "updateProduct",
                            Map.of("productId", productId, "payload", Map.of("status", "HIDDEN")),
                            "Ẩn sản phẩm #" + firstId + " trước khi xóa vĩnh viễn",
                            "high"),
                    new AiAgentAction(
                            "permanentDeleteProduct",
                            Map.of("productId", productId),
                            "Xóa vĩnh viễn sản phẩm #" + firstId,
                            "high"));
        }

        if (containsAny(text, "huy don", "huy order", "cancel order")) {
            return List.of(new AiAgentAction(
                    "cancelOrder",
                    Map.of("orderId", firstId == null ? 0 : firstId, "reason", "Admin hủy bằng AI agent"),
                    firstId == null ? "Hủy đơn hàng, cần nhập ID đơn" : "Hủy đơn hàng #" + firstId,
                    "high"));
        }

        if (firstId == null && containsAny(text, "an san pham", "hide product", "khoi phuc", "restore",
                "doi gia", "cap nhat san pham", "sua san pham", "don", "order")) {
            return draftActions(input, context);
        }

        if (firstId == null) {
            return List.of();
        }

        if (containsAny(text, "an san pham", "xoa san pham", "delete product", "hide product")) {
            Long productId = selectProductId(input, firstId, resolvedProductId);
            return List.of(new AiAgentAction(
                    "deleteProduct",
                    Map.of("productId", productId == null ? 0 : productId),
                    "Ẩn sản phẩm #" + firstId,
                    "high"));
        }
        if (text.contains("khoi phuc") || text.contains("restore")) {
            Long productId = selectProductId(input, firstId, resolvedProductId);
            return List.of(new AiAgentAction(
                    "restoreProduct",
                    Map.of("productId", productId == null ? 0 : productId),
                    "Khôi phục sản phẩm #" + firstId,
                    "low"));
        }

        if (containsAny(text, "cap nhat san pham", "sua san pham", "doi gia", "update product")) {
            Map<String, Object> payload = productUpdatePayload(input, text);
            if (!payload.isEmpty()) {
                Long productId = selectProductId(input, firstId, resolvedProductId);
                return List.of(new AiAgentAction(
                        "updateProduct",
                        Map.of("productId", productId == null ? 0 : productId, "payload", payload),
                        "Cập nhật sản phẩm #" + (productId == null ? 0 : productId),
                        "medium"));
            }
        }

        if (text.contains("don") || text.contains("order")) {
            String status = extractStatus(input);
            if (status != null) {
                return List.of(new AiAgentAction(
                        "updateOrderStatus",
                        Map.of("orderId", firstId, "status", status),
                        "Đổi trạng thái đơn #" + firstId + " sang " + status,
                        "high"));
            }
        }
        return List.of();
    }

    private List<AiAgentAction> draftActions(String input, EcommerceContext context) {
        String text = normalizeText(input);
        Long firstId = firstNumber(input);
        Long resolvedProductId = resolveProductId(input, context);

        if (containsAny(text, "danh muc", "category")) {
            String name = extractName(input, "Danh mục mới");
            return List.of(new AiAgentAction(
                    "createCategory",
                    Map.of("name", name, "slug", slugify(name)),
                    "Tạo danh mục nháp, vui lòng kiểm tra lại",
                    "low"));
        }

        if (containsAny(text, "don", "order")) {
            String status = extractStatus(input);
            return List.of(new AiAgentAction(
                    "updateOrderStatus",
                    Map.of("orderId", firstId == null ? 0 : firstId, "status", status == null ? "PENDING" : status),
                    "Cập nhật đơn hàng nháp, vui lòng kiểm tra ID và trạng thái",
                    "high"));
        }

        if (containsAny(text, "xoa", "an", "khoi phuc", "restore", "delete", "product", "san pham")) {
            Map<String, Object> payload = new LinkedHashMap<>();
            Integer price = extractIntegerAfter(input, "gia", "price");
            Integer stock = extractIntegerAfter(input, "ton kho", "so luong", "stock", "quantity");
            String productStatus = extractProductStatus(text);
            if (price != null) {
                payload.put("price", price);
            }
            if (stock != null) {
                payload.put("stockQuantity", stock);
            }
            if (productStatus != null) {
                payload.put("status", productStatus);
            }
            Long productId = selectProductId(input, firstId, resolvedProductId);
            return List.of(new AiAgentAction(
                    "updateProduct",
                    Map.of("productId", productId == null ? 0 : productId, "payload", payload),
                    "Cập nhật sản phẩm nháp, vui lòng kiểm tra ID và nội dung",
                    "medium"));
        }

        Map<String, Object> args = new LinkedHashMap<>();
        args.put("name", extractName(input, "Sản phẩm mới"));
        args.put("description", extractDescription(input));
        args.put("price", valueOrZero(extractIntegerAfter(input, "gia", "price")));
        args.put("purchasePrice", valueOrZero(extractIntegerAfter(input, "gia nhap", "purchase price", "purchaseprice")));
        args.put("stockQuantity", valueOrZero(extractIntegerAfter(input, "ton kho", "so luong", "stock", "quantity")));
        Integer categoryId = inferCategoryId(input, context);
        if (categoryId != null) {
            args.put("categoryId", categoryId);
        }
        args.put("status", "ACTIVE");
        args.put("imageUrl", defaultImageUrl(input));
        return List.of(new AiAgentAction(
                "createProduct",
                args,
                "Tạo sản phẩm nháp từ yêu cầu chưa rõ, vui lòng kiểm tra lại",
                "low"));
    }

    private Map<String, Object> productUpdatePayload(String input, String normalizedText) {
        Map<String, Object> payload = new LinkedHashMap<>();
        String name = extractUpdatedName(input);
        Integer price = extractIntegerAfter(input, "gia", "price");
        Integer purchasePrice = extractIntegerAfter(input, "gia nhap", "purchase price", "purchaseprice");
        Integer stock = extractIntegerAfter(input, "ton kho", "so luong", "stock", "quantity");
        Integer categoryId = extractIntegerAfter(input, "danh muc", "category");
        String productStatus = isProductStatusUpdateRequested(input) ? extractProductStatus(normalizedText) : null;
        String description = extractDescription(input);
        String imageUrl = extractUrl(input);

        if (hasValue(name)) {
            payload.put("name", name);
        }
        if (hasValue(description)) {
            payload.put("description", description);
        }
        if (price != null) {
            payload.put("price", price);
        }
        if (purchasePrice != null) {
            payload.put("purchasePrice", purchasePrice);
        }
        if (stock != null) {
            payload.put("stockQuantity", stock);
        }
        if (categoryId != null) {
            payload.put("categoryId", categoryId);
        }
        if (productStatus != null) {
            payload.put("status", productStatus);
        }
        if (hasValue(imageUrl)) {
            payload.put("imageUrl", imageUrl);
        }
        return payload;
    }

    private String extractUrl(String input) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("(https?://\\S+)")
                .matcher(input == null ? "" : input);
        return matcher.find() ? matcher.group(1).trim() : "";
    }

    private String extractUpdatedName(String input) {
        String raw = input == null ? "" : input;
        for (String pattern : List.of(
                "(?iu)(?:đổi tên|doi ten|rename)\\s+(?:sản phẩm|san pham|product)?\\s+.+?\\s+(?:thành|thanh|sang|to|là|la)\\s+(.+?)(?:\\s+(?:giá|gia|price|giá nhập|gia nhap|tồn kho|ton kho|số lượng|so luong|danh mục|danh muc|category|trạng thái|trang thai|status)\\b|$)",
                "(?iu)(?:tên mới|ten moi|new name|name)\\s+(.+?)(?:\\s+(?:giá|gia|price|giá nhập|gia nhap|tồn kho|ton kho|số lượng|so luong|danh mục|danh muc|category|trạng thái|trang thai|status)\\b|$)")) {
            java.util.regex.Matcher renameMatcher = java.util.regex.Pattern.compile(pattern).matcher(raw);
            if (renameMatcher.find()) {
                return cleanExtractedName(renameMatcher.group(1));
            }
        }

        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("(?i)(?:doi ten|đổi tên|ten moi|tên mới|rename|name)\\s+(.+?)(?:\\s*,?\\s+(?:gia|giá|price|gia nhap|giá nhập|ton kho|tồn kho|so luong|số lượng|danh muc|danh mục|category|trang thai|trạng thái|status)\\b|$)")
                .matcher(input);
        return matcher.find() ? cleanExtractedName(matcher.group(1)) : "";
    }

    private String extractStatus(String input) {
        String upper = input.toUpperCase(Locale.ROOT);
        for (String status : List.of("PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED")) {
            if (upper.contains(status)) {
                return status;
            }
        }
        return null;
    }

    private String extractProductStatus(String text) {
        if (matchesProductStatusPhrase(text,
                "hidden",
                "status hidden",
                "trang thai hidden",
                "an san pham",
                "trang thai an",
                "tam dung",
                "ngung ban")) {
            return "HIDDEN";
        }
        if (matchesProductStatusPhrase(text,
                "active",
                "status active",
                "trang thai active",
                "hien san pham",
                "hien thi",
                "bo an",
                "mo ban",
                "dang ban")) {
            return "ACTIVE";
        }
        return null;
    }

    private boolean isProductStatusUpdateRequested(String input) {
        String text = normalizeText(input);
        return matchesProductStatusPhrase(text,
                "status hidden",
                "status active",
                "trang thai hidden",
                "trang thai active",
                "trang thai an",
                "trang thai hien",
                "an san pham",
                "hien san pham",
                "hien thi",
                "bo an",
                "tam dung",
                "ngung ban",
                "mo ban",
                "dang ban");
    }

    private boolean matchesProductStatusPhrase(String text, String... phrases) {
        String normalizedText = normalizeText(text);
        for (String phrase : phrases) {
            String normalizedPhrase = normalizeText(phrase);
            if (java.util.regex.Pattern
                    .compile("(^|\\s)" + java.util.regex.Pattern.quote(normalizedPhrase) + "(\\s|$)")
                    .matcher(normalizedText)
                    .find()) {
                return true;
            }
        }
        return false;
    }

    private Long selectProductId(String input, Long parsedId, Long resolvedId) {
        return hasExplicitProductId(input) ? parsedId : (resolvedId == null ? parsedId : resolvedId);
    }

    private boolean hasExplicitProductId(String input) {
        String text = normalizeText(input);
        return java.util.regex.Pattern
                .compile("(#|\\bid\\b|\\bma\\b)\\D{0,12}\\d+")
                .matcher(text)
                .find();
    }

    private Long resolveProductId(String input, EcommerceContext context) {
        String targetName = extractTargetProductName(input);
        List<Map<String, Object>> contextProducts = context == null ? List.of() : context.products();
        if (!targetName.isBlank()) {
            ProductMatch contextBest = bestProductMatch(targetName, contextProducts, true);
            if (contextBest.score() >= 10) {
                return contextBest.id();
            }

            ProductMatch dbBest = bestProductMatch(targetName, contextService.findProductsForAgentLookup(), true);
            if (dbBest.score() >= 10) {
                return dbBest.id();
            }
        }

        String text = normalizeText(input);
        ProductMatch best = bestProductMatch(text, contextProducts, false);
        if (best.score() >= 12) {
            return best.id();
        }

        ProductMatch dbBest = bestProductMatch(text, contextService.findProductsForAgentLookup(), false);
        return dbBest.score() >= 12 ? dbBest.id() : null;
    }

    private ProductMatch bestProductMatch(
            String normalizedInput,
            List<Map<String, Object>> products,
            boolean strictTarget) {
        Long bestId = null;
        int bestScore = 0;
        for (Map<String, Object> product : products == null ? List.<Map<String, Object>>of() : products) {
            String productName = normalizeText(String.valueOf(product.getOrDefault("name", "")));
            if (productName.isBlank()) {
                continue;
            }
            int score = productMatchScore(normalizedInput, productName, strictTarget);
            if (score > bestScore) {
                bestId = longFromObject(product.get("id"));
                bestScore = score;
            }
        }
        return new ProductMatch(bestId, bestScore);
    }

    private int productMatchScore(String normalizedInput, String productName, boolean strictTarget) {
        String compactInput = normalizedInput.replace(" ", "");
        String compactName = productName.replace(" ", "");
        if (normalizedInput.equals(productName)) {
            return 2000 + productName.length();
        }
        if (compactInput.equals(compactName)) {
            return 1900 + productName.length();
        }
        if (normalizedInput.contains(productName)) {
            return 1000 + productName.length();
        }
        if (compactInput.contains(compactName) && compactName.length() >= 4) {
            return 950 + productName.length();
        }
        if (productName.contains(normalizedInput) && normalizedInput.length() >= 4) {
            return 900 + normalizedInput.length();
        }
        if (compactName.contains(compactInput) && compactInput.length() >= 4) {
            return 850 + compactInput.length();
        }
        int score = 0;
        int matchedTokens = 0;
        int totalTokens = 0;
        for (String token : productName.split("\\s+")) {
            if (token.length() >= 3) {
                totalTokens++;
            }
            if (token.length() >= 3 && normalizedInput.contains(token)) {
                score += token.length();
                matchedTokens++;
            }
        }
        if (matchedTokens == 0) {
            return 0;
        }
        if (strictTarget && totalTokens > 1 && matchedTokens < Math.min(2, totalTokens)) {
            return 0;
        }
        return score + matchedTokens * 3;
    }

    private String extractTargetProductName(String input) {
        String text = normalizeText(input);
        List<String> patterns = List.of(
                "(?:cap nhat|sua|update)\\s+(?:san pham|product)?\\s*(.+?)(?=\\s+(?:gia|price|gia nhap|purchase price|purchaseprice|ton kho|so luong|stock|quantity|danh muc|category|trang thai|status|mo ta|description|doi ten|ten moi|rename|name)\\b|$)",
                "(?:doi gia|cap nhat gia|sua gia)\\s+(?:san pham|product)?\\s*(.+?)(?=\\s+(?:thanh|len|xuong|con|la|=|gia|price)\\b|$)",
                "(?:xoa vinh vien|xoa han|xoa|an|hide|delete|permanent delete|delete permanently)\\s+(?:san pham|product)?\\s*(.+?)(?=\\s+(?:id|ma|#|gia|price|ton kho|so luong|stock|quantity)\\b|$)",
                "(?:khoi phuc|restore)\\s+(?:san pham|product)?\\s*(.+?)(?=\\s+(?:id|ma|#)\\b|$)");

        for (String pattern : patterns) {
            java.util.regex.Matcher matcher = java.util.regex.Pattern.compile(pattern).matcher(text);
            if (matcher.find()) {
                String target = cleanTargetProductName(matcher.group(1));
                if (!target.isBlank()) {
                    return target;
                }
            }
        }

        java.util.regex.Matcher quoted = java.util.regex.Pattern
                .compile("[\"'“”]([^\"'“”]{2,})[\"'“”]")
                .matcher(input == null ? "" : input);
        return quoted.find() ? normalizeText(quoted.group(1)) : "";
    }

    private String cleanTargetProductName(String value) {
        String cleaned = value == null ? "" : value;
        cleaned = cleaned.replaceAll("^[\"'“”]+|[\"'“”]+$", "");
        cleaned = cleaned.replaceAll("^(san pham|product)\\s+", "");
        cleaned = cleaned.replaceAll("\\b(id|ma|#)\\D*\\d+\\b", "");
        cleaned = cleaned.replaceAll("\\b(thanh|len|xuong|con|la|voi|bang)\\b.*$", "");
        cleaned = cleaned.replaceAll("[,;:]+$", "");
        cleaned = cleaned.trim();
        return List.of("san pham", "product").contains(cleaned) ? "" : cleaned;
    }

    private record ProductMatch(Long id, int score) {
    }

    private Long longFromObject(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && text.matches("\\d+")) {
            return Long.parseLong(text);
        }
        return null;
    }

    private String extractName(String input, String fallback) {
        String stopLabels = "gia|giá|price|gia nhap|giá nhập|purchase price|purchaseprice|danh muc|danh mục|category|loai|loại|ton kho|tồn kho|so luong|số lượng|stock|quantity|slug|mo ta|mô tả|description";
        java.util.regex.Matcher quoted = java.util.regex.Pattern
                .compile("[\"“”']([^\"“”']{2,})[\"“”']")
                .matcher(input);
        if (quoted.find()) {
            return quoted.group(1).trim();
        }

        java.util.regex.Matcher named = java.util.regex.Pattern
                .compile("(?i)(?:ten|tên|name)\\s+(.+?)(?:\\s*,?\\s+(?:" + stopLabels + ")\\b|$)")
                .matcher(input);
        if (named.find()) {
            return cleanExtractedName(named.group(1));
        }

        java.util.regex.Matcher created = java.util.regex.Pattern
                .compile("(?i)(?:tao|tạo|them|thêm|create)\\s+(?:san pham|sản phẩm|product|danh muc|danh mục|category)\\s+(.+?)(?:\\s*,?\\s+(?:" + stopLabels + ")\\b|$)")
                .matcher(input);
        if (created.find() && !created.group(1).trim().isBlank()) {
            return cleanExtractedName(created.group(1));
        }

        return fallback;
    }

    private String cleanExtractedName(String value) {
        String cleaned = value == null ? "" : value.trim();
        String normalized = normalizeText(cleaned);
        int cutAt = cleaned.length();
        for (String label : List.of("so luong", "gia nhap", "gia", "danh muc", "loai", "ton kho", "stock",
                "quantity", "price", "category", "trang thai", "status")) {
            int index = normalized.indexOf(label);
            if (index >= 0) {
                cutAt = Math.min(cutAt, index);
            }
        }
        cleaned = cleaned.substring(0, Math.max(0, Math.min(cleaned.length(), cutAt))).trim();
        cleaned = cleaned.replaceAll("[,;:]+$", "").trim();
        return cleaned.isBlank() ? "Sản phẩm mới" : cleaned;
    }

    private String extractDescription(String input) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("(?i)(?:mo ta|mô tả|description)\\s+(.+?)(?:\\s+(?:gia|giá|price|danh muc|danh mục|category|ton kho|tồn kho)\\b|$)")
                .matcher(input);
        return matcher.find() ? matcher.group(1).trim() : "";
    }

    private Integer extractIntegerAfter(String input, String... labels) {
        String normalizedInput = normalizeText(input);
        for (String label : labels) {
            String normalizedLabel = normalizeText(label);
            String labelPattern = java.util.regex.Pattern.quote(normalizedLabel);
            if ("gia".equals(normalizedLabel)) {
                labelPattern = "gia(?!\\s+nhap)";
            }
            java.util.regex.Matcher matcher = java.util.regex.Pattern
                    .compile(labelPattern + "\\D{0,80}(\\d[\\d.,]*)")
                    .matcher(normalizedInput);
            if (matcher.find()) {
                return parsePositiveInteger(matcher.group(1));
            }
        }
        return null;
    }

    private Integer inferCategoryId(String input, EcommerceContext context) {
        if (context == null || context.categories() == null) {
            return null;
        }
        String text = normalizeText(input);

        for (Map<String, Object> category : context.categories()) {
            String name = normalizeText(String.valueOf(category.getOrDefault("name", "")));
            String slug = normalizeText(String.valueOf(category.getOrDefault("slug", ""))).replace("-", " ");
            if ((!name.isBlank() && text.contains(name)) || (!slug.isBlank() && text.contains(slug))) {
                return integerFromObject(category.get("id"));
            }
        }

        if (containsAny(text, "dien thoai", "smartphone", "phone", "mobile")) {
            return findCategoryByKeywords(context, "dien thoai", "phone", "mobile", "smartphone");
        }
        if (containsAny(text, "laptop", "may tinh xach tay", "notebook")) {
            return findCategoryByKeywords(context, "laptop", "may tinh xach tay", "notebook");
        }
        if (containsAny(text, "phu kien", "accessory", "accessories")) {
            return findCategoryByKeywords(context, "phu kien", "accessory", "accessories");
        }
        return null;
    }

    private Integer findCategoryByKeywords(EcommerceContext context, String... keywords) {
        for (Map<String, Object> category : context.categories()) {
            String searchable = normalizeText(String.valueOf(category.getOrDefault("name", ""))
                    + " "
                    + String.valueOf(category.getOrDefault("slug", ""))).replace("-", " ");
            if (containsAny(searchable, keywords)) {
                return integerFromObject(category.get("id"));
            }
        }
        return null;
    }

    private Integer integerFromObject(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && text.matches("\\d+")) {
            return Integer.parseInt(text);
        }
        return null;
    }

    private String defaultImageUrl(String input) {
        String text = normalizeText(input);
        if (containsAny(text, "laptop", "may tinh xach tay", "notebook")) {
            return "https://placehold.co/900x700/e0f2fe/0f172a?text=Laptop";
        }
        if (containsAny(text, "dien thoai", "smartphone", "phone", "mobile")) {
            return "https://placehold.co/900x700/dbeafe/0f172a?text=Dien+thoai";
        }
        return "https://placehold.co/900x700/f8fafc/0f172a?text=DTPShop";
    }

    private Integer parsePositiveInteger(String raw) {
        String digits = raw == null ? "" : raw.replaceAll("\\D", "");
        if (digits.isBlank()) {
            return null;
        }
        try {
            long value = Long.parseLong(digits);
            return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) value;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private boolean containsAll(String text, String... parts) {
        for (String part : parts) {
            if (!text.contains(normalizeText(part))) {
                return false;
            }
        }
        return true;
    }

    private boolean containsAny(String text, String... parts) {
        for (String part : parts) {
            if (text.contains(normalizeText(part))) {
                return true;
            }
        }
        return false;
    }

    private String normalizeText(String value) {
        String normalized = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);
        return normalized.replaceAll("\\s+", " ").trim();
    }

    private String slugify(String value) {
        return normalizeText(value)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }

    private Long firstNumber(String input) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\d+").matcher(input);
        return matcher.find() ? Long.parseLong(matcher.group()) : null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> normalizeMap(Object value) {
        if (!(value instanceof Map<?, ?> map)) {
            return Map.of();
        }
        Map<String, Object> normalized = new LinkedHashMap<>();
        map.forEach((key, mapValue) -> normalized.put(String.valueOf(key),
                mapValue instanceof Map<?, ?> ? normalizeMap(mapValue) : mapValue));
        return normalized;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return "{}";
        }
    }

    private record StoredPlan(long userId, String input, AiPlanResponse response) {
    }
}
