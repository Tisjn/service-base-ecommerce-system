package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.client.ProductServiceClient;
import com.dtpshop.orderservice.dto.CartItemDto;
import com.dtpshop.orderservice.dto.OrderRequestDto;
import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderItem;
import com.dtpshop.orderservice.model.OrderStatus;
import com.dtpshop.orderservice.repository.OrderRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final EventPublisherService eventPublisherService;
    private final CartService cartService;
    private final ProductServiceClient productServiceClient;

    @Autowired
    public OrderService(OrderRepository orderRepository,
            EventPublisherService eventPublisherService,
            CartService cartService,
            ProductServiceClient productServiceClient) {
        this.orderRepository = orderRepository;
        this.eventPublisherService = eventPublisherService;
        this.cartService = cartService;
        this.productServiceClient = productServiceClient;
    }

    public OrderService(OrderRepository orderRepository,
            EventPublisherService eventPublisherService,
            CartService cartService) {
        this(orderRepository, eventPublisherService, cartService, null);
    }

    @Transactional
    public Order createOrder(Long userId, OrderRequestDto requestDto) {
        List<CartItemDto> cartItems = productServiceClient == null ? List.of() : productServiceClient.getCart(userId);
        if (cartItems.isEmpty()) {
            cartItems = cartService.getCart(userId);
        }
        if (cartItems.isEmpty()) {
            throw new IllegalStateException("Giỏ hàng trống");
        }

        Order order = new Order();
        order.setUserId(userId);
        order.setShippingAddress(requestDto.getShippingAddress());
        order.setStatus(OrderStatus.PENDING);

        BigDecimal total = cartItems.stream()
                .map(CartItemDto::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setTotalAmount(total);

        final Order pendingOrder = order;
        List<OrderItem> items = cartItems.stream().map(cartItem -> {
            OrderItem item = new OrderItem();
            item.setProductId(cartItem.getProductId());
            item.setProductName(cartItem.getProductName());
            item.setQuantity(cartItem.getQuantity());
            item.setPrice(cartItem.getPrice());
            item.setSubtotal(cartItem.getSubtotal());
            item.setOrder(pendingOrder);
            return item;
        }).collect(Collectors.toList());
        items.forEach(pendingOrder::addItem);
        orderRepository.save(pendingOrder);
        if (productServiceClient != null) {
            boolean reserved = productServiceClient.reserveInventory(cartItems, "order-" + pendingOrder.getId());
            if (!reserved) {
                throw new IllegalStateException("Không đủ tồn kho để thực hiện đơn hàng.");
            }
            productServiceClient.clearCart(userId);
        }
        cartService.clearCart(userId);
        return order;
    }

    public List<Order> findOrders(Long userId) {
        return orderRepository.findByUserId(userId);
    }

    public List<Order> findAllOrders() {
        return orderRepository.findAll();
    }

    public Order getOrder(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
    }

    @Transactional
    public Order updateStatus(Long orderId, OrderStatus status) {
        Order order = getOrder(orderId);
        order.setStatus(status);
        order.updateTimestamp();
        return orderRepository.save(order);
    }

    @Transactional
    public Order cancelOrder(Long orderId, String reason, String correlationId) {
        Order order = getOrder(orderId);
        order.setStatus(OrderStatus.CANCELLED);
        order.setUpdatedAt(LocalDateTime.now());
        Order cancelled = orderRepository.save(order);
        if (productServiceClient != null) {
            List<CartItemDto> reservedItems = order.getItems().stream()
                    .map(item -> new CartItemDto(item.getProductId(), item.getProductName(), item.getQuantity(),
                            item.getPrice()))
                    .collect(Collectors.toList());
            productServiceClient.refundInventory(reservedItems, correlationId);
        }
        eventPublisherService.publishOrderCancelled(new com.dtpshop.orderservice.event.OrderCancelledEvent(
                order.getId(),
                order.getUserId(),
                reason,
                correlationId,
                LocalDateTime.now()));
        return cancelled;
    }

    @Transactional
    public void confirmOrder(Long orderId, String paymentId) {
        Order order = getOrder(orderId);
        order.setStatus(OrderStatus.CONFIRMED);
        order.setPaymentId(paymentId);
        order.updateTimestamp();
        orderRepository.save(order);
    }
}
