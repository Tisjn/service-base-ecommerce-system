package com.dtpshop.orderservice.controller;

import com.dtpshop.orderservice.dto.CartItemDto;
import com.dtpshop.orderservice.dto.OrderRequestDto;
import com.dtpshop.orderservice.dto.OrderResponseDto;
import com.dtpshop.orderservice.dto.QuantityUpdateDto;
import com.dtpshop.orderservice.dto.StatusUpdateDto;
import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderItem;
import com.dtpshop.orderservice.service.CartService;
import com.dtpshop.orderservice.service.OrderService;
import jakarta.validation.Valid;
import java.util.List;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Validated
public class OrderController {

    private final OrderService orderService;
    private final CartService cartService;

    public OrderController(OrderService orderService, CartService cartService) {
        this.orderService = orderService;
        this.cartService = cartService;
    }

    @GetMapping("/cart/{userId}")
    public ResponseEntity<List<CartItemDto>> getCart(@PathVariable("userId") Long userId) {
        return ResponseEntity.ok(cartService.getCart(userId));
    }

    @PostMapping("/cart/{userId}/items")
    public ResponseEntity<Void> addCartItem(@PathVariable("userId") Long userId,
            @Valid @RequestBody CartItemDto item) {
        cartService.addItem(userId, item);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PatchMapping("/cart/{userId}/items/{productId}")
    public ResponseEntity<Void> updateCartItem(@PathVariable("userId") Long userId,
            @PathVariable("productId") Long productId,
            @RequestBody QuantityUpdateDto updateDto) {
        cartService.updateItem(userId, productId, updateDto.getQuantity());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/cart/{userId}/items/{productId}")
    public ResponseEntity<Void> removeCartItem(@PathVariable("userId") Long userId,
            @PathVariable("productId") Long productId) {
        cartService.removeItem(userId, productId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/cart/{userId}")
    public ResponseEntity<Void> clearCart(@PathVariable("userId") Long userId) {
        cartService.clearCart(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/orders")
    public ResponseEntity<OrderResponseDto> createOrder(@RequestParam("userId") Long userId,
            @Valid @RequestBody OrderRequestDto requestDto) {
        Order order = orderService.createOrder(userId, requestDto);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(toResponse(order));
    }

    @PostMapping("/orders/{userId}")
    public ResponseEntity<OrderResponseDto> createOrderForUser(@PathVariable("userId") Long userId,
            @Valid @RequestBody OrderRequestDto requestDto) {
        return createOrder(userId, requestDto);
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

    private OrderResponseDto toResponse(Order order) {
        List<CartItemDto> items = order.getItems().stream().map(this::itemToDto).collect(Collectors.toList());
        return new OrderResponseDto(
                order.getId(),
                order.getUserId(),
                order.getStatus(),
                order.getTotalAmount(),
                order.getShippingAddress(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                items);
    }

    private CartItemDto itemToDto(OrderItem item) {
        return new CartItemDto(item.getProductId(), item.getProductName(), item.getQuantity(), item.getPrice());
    }
}
