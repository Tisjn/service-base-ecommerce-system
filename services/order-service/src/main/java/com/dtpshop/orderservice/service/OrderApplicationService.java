package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.client.ProductServiceClient;
import com.dtpshop.orderservice.dto.CartItemDto;
import com.dtpshop.orderservice.dto.OrderRequestDto;
import com.dtpshop.orderservice.dto.OrderResponseDto;
import com.dtpshop.orderservice.event.OrderCancelledEvent;
import com.dtpshop.orderservice.event.OrderCreatedEvent;
import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderItem;
import com.dtpshop.orderservice.model.OrderStatus;
import com.dtpshop.orderservice.repository.OrderRepository;
import com.dtpshop.orderservice.service.state.OrderStateMachine;
import com.dtpshop.orderservice.service.strategy.ShippingFeeStrategy;
import com.dtpshop.orderservice.websocket.OrderWebSocketNotifier;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(OrderApplicationService.class);

    private final OrderRepository orderRepository;
    private final EventPublisherService eventPublisherService;
    private final CartService cartService;
    private final ProductServiceClient productServiceClient;
    private final OrderWebSocketNotifier orderWebSocketNotifier;
    private final ShippingFeeStrategy shippingFeeStrategy;
    private final OrderStateMachine orderStateMachine;

    public OrderApplicationService(OrderRepository orderRepository,
            EventPublisherService eventPublisherService,
            CartService cartService,
            ProductServiceClient productServiceClient,
            OrderWebSocketNotifier orderWebSocketNotifier,
            ShippingFeeStrategy shippingFeeStrategy,
            OrderStateMachine orderStateMachine) {
        this.orderRepository = orderRepository;
        this.eventPublisherService = eventPublisherService;
        this.cartService = cartService;
        this.productServiceClient = productServiceClient;
        this.orderWebSocketNotifier = orderWebSocketNotifier;
        this.shippingFeeStrategy = shippingFeeStrategy;
        this.orderStateMachine = orderStateMachine;
    }

    @Transactional
    public Order createOrder(Long userId, String cartKey, String customerEmail, OrderRequestDto requestDto) {
        String correlationId = UUID.randomUUID().toString();
        List<CartItemDto> cartItems = cartService.getCart(cartKey);
        if (cartItems.isEmpty()) {
            throw new IllegalStateException("Gio hang trong");
        }

        Order order = buildPendingOrder(userId, requestDto, cartItems);
        orderRepository.save(order);

        logger.info("Created pending order orderId={}, userId={}, correlationId={}",
                order.getId(), userId, correlationId);
        removeOrderedItemsAfterCommit(cartKey, cartItems);
        publishOrderCreatedAfterCommit(order, cartItems, cartKey, customerEmail, correlationId);
        notifyAdminsAfterCommit(order, cartItems);
        return order;
    }

    @Transactional
    public Order updateStatus(Long orderId, OrderStatus status) {
        Order order = findOrder(orderId);
        OrderStatus current = order.getStatus();
        orderStateMachine.validateTransition(current, status);
        order.setStatus(status);
        if (status == OrderStatus.DELIVERED) {
            order.setCompletedAt(LocalDateTime.now());
        }
        order.updateTimestamp();
        Order saved = orderRepository.save(order);
        logger.info("Updated order status orderId={}, userId={}, from={}, to={}",
                saved.getId(), saved.getUserId(), current, status);
        notifyOrderStatusAfterCommit(saved);
        return saved;
    }

    @Transactional
    public Order cancelOrder(Long orderId, String reason, String correlationId) {
        Order order = findOrder(orderId);
        orderStateMachine.validateTransition(order.getStatus(), OrderStatus.CANCELLED);
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.updateTimestamp();
        Order cancelled = orderRepository.save(order);

        if (productServiceClient != null) {
            productServiceClient.refundInventory(toCartItems(order), correlationId);
        }

        publishOrderCancelledAfterCommit(order, reason, correlationId);
        notifyOrderStatusAfterCommit(cancelled);
        logger.info("Cancelled order orderId={}, userId={}, correlationId={}, reason={}",
                order.getId(), order.getUserId(), correlationId, reason);
        return cancelled;
    }

    @Transactional
    public void confirmOrder(Long orderId, String paymentId) {
        confirmOrder(orderId, paymentId, "PAID", null);
    }

    @Transactional
    public Order confirmOrder(Long orderId, String paymentId, String paymentStatus, String paymentUrl) {
        Order order = findOrder(orderId);
        if (order.getStatus() != OrderStatus.CONFIRMED) {
            orderStateMachine.validateTransition(order.getStatus(), OrderStatus.CONFIRMED);
        }
        order.setStatus(OrderStatus.CONFIRMED);
        order.setPaymentId(parseLong(paymentId));
        order.setPaymentStatus(normalizePaymentStatus(paymentStatus));
        order.setPaymentUrl(paymentUrl);
        order.updateTimestamp();
        Order saved = orderRepository.save(order);
        saved.getItems().size();
        notifyOrderStatusAfterCommit(saved);
        return saved;
    }

    @Transactional
    public Order failOrder(Long orderId, String reason, String correlationId) {
        Order order = findOrder(orderId);
        if (order.getStatus() != OrderStatus.CANCELLED) {
            orderStateMachine.validateTransition(order.getStatus(), OrderStatus.CANCELLED);
        }
        order.setStatus(OrderStatus.CANCELLED);
        order.setPaymentStatus("FAILED");
        order.setCancelledAt(LocalDateTime.now());
        order.updateTimestamp();
        Order saved = orderRepository.save(order);
        publishOrderCancelledAfterCommit(order, reason, correlationId);
        notifyOrderStatusAfterCommit(saved);
        logger.warn("Failed order orderId={}, userId={}, correlationId={}, reason={}",
                order.getId(), order.getUserId(), correlationId, reason);
        return saved;
    }

    private Order buildPendingOrder(Long userId, OrderRequestDto requestDto, List<CartItemDto> cartItems) {
        Order order = new Order();
        order.setUserId(userId);
        order.setAddressId(requestDto.getAddressId());
        order.setOrderCode("DTP-" + System.currentTimeMillis());
        order.setStatus(OrderStatus.PENDING);
        order.setNote(blankToNull(requestDto.getNote()));
        order.setPaymentMethod(normalizePaymentMethod(requestDto.getPaymentMethod()));

        BigDecimal subtotal = cartItems.stream()
                .map(CartItemDto::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal shippingFee = shippingFeeStrategy.calculate(subtotal);
        order.setSubtotal(subtotal);
        order.setShippingFee(shippingFee);
        order.setFinalAmount(subtotal.add(shippingFee));

        cartItems.stream()
                .map(cartItem -> toOrderItem(order, cartItem))
                .forEach(order::addItem);
        return order;
    }

    private OrderItem toOrderItem(Order order, CartItemDto cartItem) {
        OrderItem item = new OrderItem();
        item.setProductId(cartItem.getProductId());
        item.setProductName(cartItem.getProductName());
        item.setQuantity(cartItem.getQuantity());
        item.setPrice(cartItem.getPrice());
        item.setSubtotal(cartItem.getSubtotal());
        item.setOrder(order);
        return item;
    }

    private void publishOrderCreatedAfterCommit(Order order, List<CartItemDto> itemsToProcess, String cartKey,
            String customerEmail, String correlationId) {
        OrderCreatedEvent event = new OrderCreatedEvent(
                order.getId(),
                order.getUserId(),
                order.getAddressId(),
                order.getNote(),
                itemsToProcess,
                order.getFinalAmount(),
                order.getPaymentMethod(),
                cartKey,
                customerEmail,
                correlationId,
                LocalDateTime.now());

        OrderSideEffectScheduler.afterCommit(() -> eventPublisherService.publishOrderCreated(event));
    }

    private void removeOrderedItemsAfterCommit(String cartKey, List<CartItemDto> orderedItems) {
        OrderSideEffectScheduler.afterCommit(() -> cartService.removeItems(cartKey, orderedItems));
    }

    private void publishOrderCancelledAfterCommit(Order order, String reason, String correlationId) {
        OrderCancelledEvent event = new OrderCancelledEvent(
                order.getId(),
                order.getUserId(),
                reason,
                correlationId,
                LocalDateTime.now());
        OrderSideEffectScheduler.afterCommit(() -> eventPublisherService.publishOrderCancelled(event));
    }

    private void notifyAdminsAfterCommit(Order order, List<CartItemDto> itemsToProcess) {
        if (orderWebSocketNotifier == null) {
            return;
        }
        OrderResponseDto notifyDto = toOrderResponseDto(order, itemsToProcess);
        OrderSideEffectScheduler.afterCommit(() -> orderWebSocketNotifier.notifyNewOrder(notifyDto));
    }

    private void notifyOrderStatusAfterCommit(Order order) {
        if (orderWebSocketNotifier == null || order == null) {
            return;
        }
        OrderResponseDto notifyDto = toOrderResponseDto(order, toCartItems(order));
        OrderSideEffectScheduler.afterCommit(() -> orderWebSocketNotifier.notifyOrderStatusChanged(notifyDto));
    }

    private OrderResponseDto toOrderResponseDto(Order order, List<CartItemDto> items) {
        return new OrderResponseDto(
                order.getId(), order.getUserId(), order.getAddressId(),
                order.getOrderCode(), order.getStatus(),
                order.getSubtotal(), order.getShippingFee(), order.getFinalAmount(),
                order.getNote(), order.getPaymentMethod(), order.getPaymentId(),
                order.getPaymentStatus(), order.getPaymentUrl(),
                order.getCreatedAt(), order.getUpdatedAt(),
                order.getCompletedAt(), order.getCancelledAt(),
                items);
    }

    private List<CartItemDto> toCartItems(Order order) {
        return order.getItems().stream()
                .map(item -> new CartItemDto(item.getProductId(), item.getProductName(), item.getQuantity(),
                        item.getPrice()))
                .collect(Collectors.toList());
    }

    private Order findOrder(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
    }

    private String normalizePaymentMethod(String method) {
        if (method == null || method.isBlank()) {
            return "COD";
        }
        String normalized = method.trim().toUpperCase();
        if (!normalized.equals("COD") && !normalized.equals("MOMO")) {
            throw new IllegalArgumentException("paymentMethod chi ho tro COD hoac MOMO");
        }
        return normalized;
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String normalizePaymentStatus(String status) {
        if (status == null || status.isBlank()) {
            return "PENDING";
        }
        String normalized = status.trim().toUpperCase();
        return switch (normalized) {
            case "PAID", "FAILED", "EXPIRED", "CANCELLED", "PENDING" -> normalized;
            default -> "PENDING";
        };
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
