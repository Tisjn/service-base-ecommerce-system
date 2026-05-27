package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.client.PaymentServiceClient;
import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderStatus;
import com.dtpshop.orderservice.repository.OrderRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderQueryService {

    private final OrderRepository orderRepository;
    private final PaymentServiceClient paymentServiceClient;

    public OrderQueryService(OrderRepository orderRepository, PaymentServiceClient paymentServiceClient) {
        this.orderRepository = orderRepository;
        this.paymentServiceClient = paymentServiceClient;
    }

    @Transactional
    public List<Order> findOrders(Long userId) {
        return orderRepository.findByUserId(userId);
    }

    @Transactional
    public Page<Order> findOrders(Long userId, OrderStatus status, Pageable pageable) {
        return status == null
                ? orderRepository.findByUserId(userId, pageable)
                : orderRepository.findByUserIdAndStatus(userId, status, pageable);
    }

    @Transactional
    public List<Order> findAllOrders() {
        return orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Transactional
    public Page<Order> findAllOrders(OrderStatus status, LocalDateTime start, LocalDateTime end, Pageable pageable) {
        Page<Order> orders;
        if (status != null && start != null && end != null) {
            orders = orderRepository.findByStatusAndCreatedAtBetween(status, start, end, pageable);
        } else if (status != null) {
            orders = orderRepository.findByStatus(status, pageable);
        } else if (start != null && end != null) {
            orders = orderRepository.findByCreatedAtBetween(start, end, pageable);
        } else {
            orders = orderRepository.findAll(pageable);
        }
        return orders;
    }

    @Transactional
    public Order getOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        refreshPaymentSnapshot(order);
        return order;
    }

    public boolean hasOrdersForProduct(Long productId) {
        return orderRepository.existsProductOrder(productId);
    }

    private void refreshPaymentSnapshot(Order order) {
        if (paymentServiceClient == null || order == null || order.getId() == null) {
            return;
        }
        PaymentServiceClient.PaymentSnapshot payment = paymentServiceClient.getLatestPayment(order.getId());
        if (payment == null) {
            return;
        }
        if (payment.getPaymentMethod() != null && !payment.getPaymentMethod().isBlank()) {
            order.setPaymentMethod(normalizePaymentMethod(payment.getPaymentMethod()));
        }
        Long paymentId = parseLong(payment.getPaymentId());
        if (paymentId != null) {
            order.setPaymentId(paymentId);
        }
        order.setPaymentStatus(normalizePaymentStatus(payment.getStatus()));
        order.setPaymentUrl(payment.getPaymentUrl());
    }

    private String normalizePaymentMethod(String method) {
        String normalized = method.trim().toUpperCase();
        return normalized.equals("MOMO") ? "MOMO" : "COD";
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
}
