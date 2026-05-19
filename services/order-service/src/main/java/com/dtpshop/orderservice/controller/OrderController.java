package com.dtpshop.orderservice.controller;

import com.dtpshop.orderservice.dto.CartItemDto;
import com.dtpshop.orderservice.dto.OrderProductDetailDto;
import com.dtpshop.orderservice.dto.OrderRequestDto;
import com.dtpshop.orderservice.dto.OrderResponseDto;
import com.dtpshop.orderservice.dto.ProductCommentRequest;
import com.dtpshop.orderservice.dto.ProductCommentResponse;
import com.dtpshop.orderservice.dto.ProductDetailWithCommentsDto;
import com.dtpshop.orderservice.dto.QuantityUpdateDto;
import com.dtpshop.orderservice.dto.StatusUpdateDto;
import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderItem;
import com.dtpshop.orderservice.service.CartService;
import com.dtpshop.orderservice.service.OrderService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@Validated
public class OrderController {

    private static final String SESSION_USER_ID = "userId";

    private final OrderService orderService;
    private final CartService cartService;

    public OrderController(OrderService orderService, CartService cartService) {
        this.orderService = orderService;
        this.cartService = cartService;
    }

    @GetMapping("/cart")
    public ResponseEntity<List<CartItemDto>> getCart(HttpSession session) {
        return ResponseEntity.ok(cartService.getCart(resolveCartKey(session)));
    }

    @PostMapping("/cart/items")
    public ResponseEntity<Void> addCartItem(HttpSession session, @Valid @RequestBody CartItemDto item) {
        cartService.addItem(resolveCartKey(session), item);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PatchMapping("/cart/items/{productId}")
    public ResponseEntity<Void> updateCartItem(HttpSession session,
            @PathVariable("productId") Long productId,
            @RequestBody QuantityUpdateDto updateDto) {
        cartService.updateItem(resolveCartKey(session), productId, updateDto.getQuantity());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/cart/items/{productId}")
    public ResponseEntity<Void> removeCartItem(HttpSession session, @PathVariable("productId") Long productId) {
        cartService.removeItem(resolveCartKey(session), productId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/cart")
    public ResponseEntity<Void> clearCart(HttpSession session) {
        cartService.clearCart(resolveCartKey(session));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/cart/session/login")
    public ResponseEntity<List<CartItemDto>> cartSessionLogin(
            HttpSession session,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestBody(required = false) Map<String, Object> body) {
        Long userId = resolveUserId(headerUserId, body == null ? null : body.get("userId"), sessionUserId(session));
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing user id");
        }

        String guestCartKey = guestCartKey(session);
        String userCartKey = String.valueOf(userId);
        cartService.mergeCart(guestCartKey, userCartKey);
        session.setAttribute(SESSION_USER_ID, userId);
        return ResponseEntity.ok(cartService.getCart(userCartKey));
    }

    @PostMapping("/cart/session/logout")
    public ResponseEntity<Void> cartSessionLogout(HttpSession session) {
        session.removeAttribute(SESSION_USER_ID);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/orders")
    public ResponseEntity<OrderResponseDto> createOrder(
            @RequestParam(value = "userId", required = false) Long requestUserId,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            HttpSession session,
            @Valid @RequestBody OrderRequestDto requestDto) {
        Long userId = resolveUserId(headerUserId, requestUserId, sessionUserId(session));
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing user id");
        }

        String currentCartKey = resolveCartKey(session);
        String userCartKey = String.valueOf(userId);
        if (!userCartKey.equals(currentCartKey)) {
            cartService.mergeCart(currentCartKey, userCartKey);
        }
        session.setAttribute(SESSION_USER_ID, userId);

        Order order = orderService.createOrder(userId, userCartKey, resolveEmail(userEmail, requestDto), requestDto);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(toResponse(order));
    }

    @PostMapping("/orders/{userId}")
    public ResponseEntity<OrderResponseDto> createOrderForUser(
            @PathVariable("userId") Long userId,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail,
            HttpSession session,
            @Valid @RequestBody OrderRequestDto requestDto) {
        String currentCartKey = resolveCartKey(session);
        String userCartKey = String.valueOf(userId);
        if (!userCartKey.equals(currentCartKey)) {
            cartService.mergeCart(currentCartKey, userCartKey);
        }
        session.setAttribute(SESSION_USER_ID, userId);
        Order order = orderService.createOrder(userId, userCartKey, resolveEmail(userEmail, requestDto), requestDto);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(toResponse(order));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponseDto>> getAllOrders() {
        List<Order> orders = orderService.findAllOrders();
        return ResponseEntity.ok(orders.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @GetMapping("/orders/user/{userId}")
    public ResponseEntity<List<OrderResponseDto>> getOrdersByUser(@PathVariable("userId") Long userId) {
        List<Order> orders = orderService.findOrders(userId);
        return ResponseEntity.ok(orders.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderResponseDto> getOrder(@PathVariable("orderId") Long orderId) {
        Order order = orderService.getOrder(orderId);
        return ResponseEntity.ok(toResponse(order));
    }

    @GetMapping("/orders/{orderId}/comments")
    public ResponseEntity<List<ProductCommentResponse>> getOrderComments(@PathVariable("orderId") Long orderId) {
        return ResponseEntity.ok(orderService.getOrderComments(orderId));
    }

    @GetMapping("/orders/products/{productId}/details")
    public ResponseEntity<OrderProductDetailDto> getOrderProductDetail(
            @PathVariable("productId") Long productId,
            @RequestParam(value = "userId", required = false) Long userId) {
        return ResponseEntity.ok(orderService.getOrderProductDetail(userId, productId));
    }

    @GetMapping("/admin/products/{productId}/details-with-comments")
    public ResponseEntity<ProductDetailWithCommentsDto> getProductDetailWithComments(
            @PathVariable("productId") Long productId) {
        ProductDetailWithCommentsDto detail = orderService.getProductDetailWithComments(productId);
        if (detail == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(detail);
    }

    @GetMapping("/admin/products/{productId}/orders-exist")
    public ResponseEntity<Map<String, Boolean>> checkProductOrderHistory(
            @PathVariable("productId") Long productId) {
        boolean ordersExist = orderService.hasOrdersForProduct(productId);
        return ResponseEntity.ok(Map.of("hasOrders", ordersExist));
    }

    @PostMapping("/orders/users/{userId}/products/{productId}/comments")
    public ResponseEntity<ProductCommentResponse> addProductComment(
            @PathVariable("userId") Long userId,
            @PathVariable("productId") Long productId,
            @Valid @RequestBody ProductCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.addProductComment(userId, productId, request));
    }

    @PatchMapping("/orders/{orderId}/status")
    public ResponseEntity<OrderResponseDto> updateOrderStatus(@PathVariable("orderId") Long orderId,
            @Valid @RequestBody StatusUpdateDto request) {
        Order order = orderService.updateStatus(orderId,
                com.dtpshop.orderservice.model.OrderStatus.valueOf(request.getStatus()));
        return ResponseEntity.ok(toResponse(order));
    }

    @DeleteMapping("/orders/{orderId}/cancel")
    public ResponseEntity<Void> cancelOrder(@PathVariable("orderId") Long orderId,
            @RequestBody(required = false) StatusUpdateDto request) {
        String reason = request == null ? "Customer cancelled" : request.getStatus();
        orderService.cancelOrder(orderId, reason, UUID.randomUUID().toString());
        return ResponseEntity.accepted().build();
    }

    private String resolveCartKey(HttpSession session) {
        Long userId = sessionUserId(session);
        return userId != null ? String.valueOf(userId) : guestCartKey(session);
    }

    private String guestCartKey(HttpSession session) {
        return "guest:" + session.getId();
    }

    private Long sessionUserId(HttpSession session) {
        Object value = session.getAttribute(SESSION_USER_ID);
        return parseLong(value);
    }

    private Long resolveUserId(String headerUserId, Object requestUserId, Long sessionUserId) {
        Long userId = parseLong(headerUserId);
        if (userId != null) {
            return userId;
        }
        userId = parseLong(requestUserId);
        return userId != null ? userId : sessionUserId;
    }

    private Long parseLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.valueOf(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String resolveEmail(String headerEmail, OrderRequestDto requestDto) {
        if (headerEmail != null && !headerEmail.isBlank()) {
            return headerEmail.trim();
        }
        String requestEmail = requestDto == null ? null : requestDto.getCustomerEmail();
        return requestEmail == null || requestEmail.isBlank() ? null : requestEmail.trim();
    }

    private OrderResponseDto toResponse(Order order) {
        List<CartItemDto> items = order.getItems().stream().map(this::itemToDto).collect(Collectors.toList());
        return new OrderResponseDto(
                order.getId(),
                order.getUserId(),
                order.getAddressId(),
                order.getOrderCode(),
                order.getStatus(),
                order.getSubtotal(),
                order.getShippingFee(),
                order.getFinalAmount(),
                order.getNote(),
                order.getPaymentMethod(),
                order.getPaymentId(),
                order.getPaymentStatus(),
                order.getPaymentUrl(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                order.getCompletedAt(),
                order.getCancelledAt(),
                items);
    }

    private CartItemDto itemToDto(OrderItem item) {
        return new CartItemDto(item.getProductId(), item.getProductName(), item.getQuantity(), item.getPrice());
    }
}
