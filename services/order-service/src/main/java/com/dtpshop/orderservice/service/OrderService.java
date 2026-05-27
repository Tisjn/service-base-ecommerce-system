package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.dto.OrderProductDetailDto;
import com.dtpshop.orderservice.dto.OrderRequestDto;
import com.dtpshop.orderservice.dto.ProductCommentRequest;
import com.dtpshop.orderservice.dto.ProductCommentResponse;
import com.dtpshop.orderservice.dto.ProductDetailWithCommentsDto;
import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderStatus;
import com.dtpshop.orderservice.repository.OrderRepository;
import com.dtpshop.orderservice.service.state.CancelledState;
import com.dtpshop.orderservice.service.state.ConfirmedState;
import com.dtpshop.orderservice.service.state.DeliveredState;
import com.dtpshop.orderservice.service.state.OrderStateMachine;
import com.dtpshop.orderservice.service.state.PendingState;
import com.dtpshop.orderservice.service.state.ProcessingState;
import com.dtpshop.orderservice.service.state.ShippedState;
import com.dtpshop.orderservice.service.strategy.StandardShippingFeeStrategy;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final OrderApplicationService orderApplicationService;
    private final OrderQueryService orderQueryService;
    private final OrderCommentService orderCommentService;

    @Autowired
    public OrderService(OrderApplicationService orderApplicationService,
            OrderQueryService orderQueryService,
            OrderCommentService orderCommentService) {
        this.orderApplicationService = orderApplicationService;
        this.orderQueryService = orderQueryService;
        this.orderCommentService = orderCommentService;
    }

    public OrderService(OrderRepository orderRepository,
            EventPublisherService eventPublisherService,
            CartService cartService) {
        OrderStateMachine stateMachine = new OrderStateMachine(List.of(
                new PendingState(),
                new ConfirmedState(),
                new ProcessingState(),
                new ShippedState(),
                new DeliveredState(),
                new CancelledState()));
        this.orderApplicationService = new OrderApplicationService(
                orderRepository,
                eventPublisherService,
                cartService,
                null,
                null,
                new StandardShippingFeeStrategy(),
                stateMachine);
        this.orderQueryService = new OrderQueryService(orderRepository, null);
        this.orderCommentService = new OrderCommentService(orderRepository, null, null);
    }

    public Order createOrder(Long userId, String cartKey, String customerEmail, OrderRequestDto requestDto) {
        return orderApplicationService.createOrder(userId, cartKey, customerEmail, requestDto);
    }

    public Order updateStatus(Long orderId, OrderStatus status) {
        return orderApplicationService.updateStatus(orderId, status);
    }

    public Order cancelOrder(Long orderId, String reason, String correlationId) {
        return orderApplicationService.cancelOrder(orderId, reason, correlationId);
    }

    public void confirmOrder(Long orderId, String paymentId) {
        orderApplicationService.confirmOrder(orderId, paymentId);
    }

    public Order confirmOrder(Long orderId, String paymentId, String paymentStatus, String paymentUrl) {
        return orderApplicationService.confirmOrder(orderId, paymentId, paymentStatus, paymentUrl);
    }

    public Order failOrder(Long orderId, String reason, String correlationId) {
        return orderApplicationService.failOrder(orderId, reason, correlationId);
    }

    public List<Order> findOrders(Long userId) {
        return orderQueryService.findOrders(userId);
    }

    public Page<Order> findOrders(Long userId, OrderStatus status, Pageable pageable) {
        return orderQueryService.findOrders(userId, status, pageable);
    }

    public List<Order> findAllOrders() {
        return orderQueryService.findAllOrders();
    }

    public Page<Order> findAllOrders(OrderStatus status, LocalDateTime start, LocalDateTime end, Pageable pageable) {
        return orderQueryService.findAllOrders(status, start, end, pageable);
    }

    public Order getOrder(Long orderId) {
        return orderQueryService.getOrder(orderId);
    }

    public OrderProductDetailDto getOrderProductDetail(Long userId, Long productId) {
        return orderCommentService.getOrderProductDetail(userId, productId);
    }

    public boolean hasOrdersForProduct(Long productId) {
        return orderQueryService.hasOrdersForProduct(productId);
    }

    public ProductCommentResponse addProductComment(Long userId, Long productId, ProductCommentRequest request) {
        return orderCommentService.addProductComment(userId, productId, request);
    }

    public List<ProductCommentResponse> getProductComments(Long productId) {
        return orderCommentService.getProductComments(productId);
    }

    public List<ProductCommentResponse> getOrderComments(Long orderId) {
        return orderCommentService.getOrderComments(orderId);
    }

    public ProductDetailWithCommentsDto getProductDetailWithComments(Long productId) {
        return orderCommentService.getProductDetailWithComments(productId);
    }
}
