package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.client.PaymentServiceClient;
import com.dtpshop.orderservice.client.ProductServiceClient;
import com.dtpshop.orderservice.dto.CartItemDto;
import com.dtpshop.orderservice.dto.OrderProductDetailDto;
import com.dtpshop.orderservice.dto.OrderRequestDto;
import com.dtpshop.orderservice.dto.ProductCommentRequest;
import com.dtpshop.orderservice.dto.ProductCommentResponse;
import com.dtpshop.orderservice.dto.ProductDetailWithCommentsDto;
import com.dtpshop.orderservice.dto.ProductSnapshotDto;
import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderItem;
import com.dtpshop.orderservice.model.OrderStatus;
import com.dtpshop.orderservice.model.ProductComment;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.dtpshop.orderservice.websocket.OrderWebSocketNotifier;
import com.dtpshop.orderservice.repository.OrderRepository;
import com.dtpshop.orderservice.repository.ProductCommentRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class OrderService {

    private static final BigDecimal FREE_SHIPPING_THRESHOLD = new BigDecimal("500000");
    private static final BigDecimal STANDARD_SHIPPING_FEE = new BigDecimal("10000");

    private final OrderRepository orderRepository;
    private final EventPublisherService eventPublisherService;
    private final CartService cartService;
    private final ProductServiceClient productServiceClient;
    private final PaymentServiceClient paymentServiceClient;
    private final ProductCommentRepository productCommentRepository;
    private final OrderWebSocketNotifier orderWebSocketNotifier;
    private final OrderEmailService orderEmailService;

    @Autowired
    public OrderService(OrderRepository orderRepository,
            EventPublisherService eventPublisherService,
            CartService cartService,
            ProductServiceClient productServiceClient,
            PaymentServiceClient paymentServiceClient,
            ProductCommentRepository productCommentRepository,
            OrderWebSocketNotifier orderWebSocketNotifier,
            OrderEmailService orderEmailService) {
        this.orderRepository = orderRepository;
        this.eventPublisherService = eventPublisherService;
        this.cartService = cartService;
        this.productServiceClient = productServiceClient;
        this.paymentServiceClient = paymentServiceClient;
        this.productCommentRepository = productCommentRepository;
        this.orderWebSocketNotifier = orderWebSocketNotifier;
        this.orderEmailService = orderEmailService;
    }

    public OrderService(OrderRepository orderRepository,
            EventPublisherService eventPublisherService,
            CartService cartService) {
        this(orderRepository, eventPublisherService, cartService, null, null, null, null, null);
    }

    @Transactional
    public Order createOrder(Long userId, String cartKey, String customerEmail, OrderRequestDto requestDto) {
        List<CartItemDto> cartItems = cartService.getCart(cartKey);
        if (cartItems.isEmpty()) {
            throw new IllegalStateException("Giỏ hàng trống");
        }

        final List<CartItemDto> itemsToProcess = cartItems;

        Order order = new Order();
        order.setUserId(userId);
        order.setAddressId(requestDto.getAddressId());
        order.setOrderCode("DTP-" + System.currentTimeMillis());
        order.setStatus(OrderStatus.PENDING);
        order.setNote(blankToNull(requestDto.getNote()));
        order.setPaymentMethod(normalizePaymentMethod(requestDto.getPaymentMethod()));

        BigDecimal subtotal = itemsToProcess.stream()
                .map(CartItemDto::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal shippingFee = subtotal.compareTo(FREE_SHIPPING_THRESHOLD) >= 0
                ? BigDecimal.ZERO
                : STANDARD_SHIPPING_FEE;
        BigDecimal finalAmount = subtotal.add(shippingFee);
        order.setSubtotal(subtotal);
        order.setShippingFee(shippingFee);
        order.setFinalAmount(finalAmount);

        final Order pendingOrder = order;
        List<OrderItem> items = itemsToProcess.stream().map(cartItem -> {
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

        if (paymentServiceClient != null) {
            PaymentServiceClient.PaymentResult paymentResult = paymentServiceClient.createPayment(
                    pendingOrder.getId(),
                    pendingOrder.getFinalAmount(),
                    pendingOrder.getPaymentMethod(),
                    "order-" + pendingOrder.getId());
            if (!paymentResult.isSuccess()) {
                throw new IllegalStateException("Khong tao duoc giao dich thanh toan.");
            }
            if ("MOMO".equals(pendingOrder.getPaymentMethod())
                    && (paymentResult.getPaymentUrl() == null || paymentResult.getPaymentUrl().isBlank())) {
                throw new IllegalStateException("Khong tao duoc link thanh toan MoMo.");
            }
            pendingOrder.setPaymentId(parseLong(paymentResult.getPaymentId()));
            pendingOrder.setPaymentUrl(paymentResult.getPaymentUrl());
            pendingOrder.setPaymentStatus(normalizePaymentStatus(paymentResult.getStatus()));
        }

        if (productServiceClient != null) {
            boolean reserved = productServiceClient.reserveInventory(itemsToProcess, "order-" + pendingOrder.getId());
            if (!reserved) {
                throw new IllegalStateException("Không đủ tồn kho để thực hiện đơn hàng.");
            }
        }
        cartService.clearCart(cartKey);
        if (orderEmailService != null) {
            orderEmailService.sendOrderPlacedEmail(customerEmail, pendingOrder);
        }
        notifyAdminsAfterCommit(pendingOrder, itemsToProcess);
        return order;
    }

    private void notifyAdminsAfterCommit(Order order, List<CartItemDto> itemsToProcess) {
        if (orderWebSocketNotifier == null) {
            return;
        }

        com.dtpshop.orderservice.dto.OrderResponseDto notifyDto = new com.dtpshop.orderservice.dto.OrderResponseDto(
                order.getId(), order.getUserId(), order.getAddressId(),
                order.getOrderCode(), order.getStatus(),
                order.getSubtotal(), order.getShippingFee(), order.getFinalAmount(),
                order.getNote(), order.getPaymentMethod(), order.getPaymentId(),
                order.getPaymentStatus(), order.getPaymentUrl(),
                order.getCreatedAt(), order.getUpdatedAt(),
                order.getCompletedAt(), order.getCancelledAt(),
                itemsToProcess);

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            orderWebSocketNotifier.notifyNewOrder(notifyDto);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                orderWebSocketNotifier.notifyNewOrder(notifyDto);
            }
        });
    }

    @Transactional
    public List<Order> findOrders(Long userId) {
        List<Order> orders = orderRepository.findByUserId(userId);
        orders.forEach(this::refreshPaymentSnapshot);
        return orders;
    }

    @Transactional
    public Page<Order> findOrders(Long userId, OrderStatus status, Pageable pageable) {
        Page<Order> orders = status == null
                ? orderRepository.findByUserId(userId, pageable)
                : orderRepository.findByUserIdAndStatus(userId, status, pageable);
        orders.getContent().forEach(this::refreshPaymentSnapshot);
        return orders;
    }

    @Transactional
    public List<Order> findAllOrders() {
        List<Order> orders = orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        orders.forEach(this::refreshPaymentSnapshot);
        return orders;
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
        orders.getContent().forEach(this::refreshPaymentSnapshot);
        return orders;
    }

    @Transactional
    public Order getOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
        refreshPaymentSnapshot(order);
        return order;
    }

    @Transactional
    public Order updateStatus(Long orderId, OrderStatus status) {
        Order order = getOrder(orderId);
        OrderStatus current = order.getStatus();
        // Allowed transitions
        boolean allowed = switch (current) {
            case PENDING -> status == OrderStatus.CONFIRMED;
            case CONFIRMED -> status == OrderStatus.PROCESSING;
            case PROCESSING -> status == OrderStatus.SHIPPED;
            case SHIPPED -> status == OrderStatus.DELIVERED;
            default -> false;
        };
        if (!allowed) {
            throw new IllegalStateException("Invalid status transition: " + current + " -> " + status);
        }
        order.setStatus(status);
        if (status == OrderStatus.DELIVERED) {
            order.setCompletedAt(LocalDateTime.now());
        }
        order.updateTimestamp();
        Order saved = orderRepository.save(order);
        notifyOrderStatusAfterCommit(saved);
        return saved;
    }

    @Transactional
    public Order cancelOrder(Long orderId, String reason, String correlationId) {
        Order order = getOrder(orderId);
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
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
        notifyOrderStatusAfterCommit(cancelled);
        return cancelled;
    }

    @Transactional
    public void confirmOrder(Long orderId, String paymentId) {
        Order order = getOrder(orderId);
        order.setStatus(OrderStatus.CONFIRMED);
        order.setPaymentId(parseLong(paymentId));
        order.setPaymentStatus("PAID");
        order.updateTimestamp();
        Order saved = orderRepository.save(order);
        notifyOrderStatusAfterCommit(saved);
    }

    private void notifyOrderStatusAfterCommit(Order order) {
        if (orderWebSocketNotifier == null || order == null) {
            return;
        }

        com.dtpshop.orderservice.dto.OrderResponseDto notifyDto = toOrderResponseDto(order);

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            orderWebSocketNotifier.notifyOrderStatusChanged(notifyDto);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                orderWebSocketNotifier.notifyOrderStatusChanged(notifyDto);
            }
        });
    }

    private com.dtpshop.orderservice.dto.OrderResponseDto toOrderResponseDto(Order order) {
        List<CartItemDto> items = order.getItems().stream()
                .map(item -> new CartItemDto(
                        item.getProductId(),
                        item.getProductName(),
                        item.getQuantity(),
                        item.getPrice()))
                .collect(Collectors.toList());

        return new com.dtpshop.orderservice.dto.OrderResponseDto(
                order.getId(), order.getUserId(), order.getAddressId(),
                order.getOrderCode(), order.getStatus(),
                order.getSubtotal(), order.getShippingFee(), order.getFinalAmount(),
                order.getNote(), order.getPaymentMethod(), order.getPaymentId(),
                order.getPaymentStatus(), order.getPaymentUrl(),
                order.getCreatedAt(), order.getUpdatedAt(),
                order.getCompletedAt(), order.getCancelledAt(),
                items);
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

    public OrderProductDetailDto getOrderProductDetail(Long userId, Long productId) {
        ProductSnapshotDto product = productServiceClient == null ? null : productServiceClient.getProduct(productId);
        List<ProductCommentResponse> comments = getProductComments(productId);
        boolean purchased = userId != null && orderRepository.existsPurchasedProduct(userId, productId);
        return new OrderProductDetailDto(product, comments, purchased);
    }

    public boolean hasOrdersForProduct(Long productId) {
        return orderRepository.existsProductOrder(productId);
    }

    @Transactional
    public ProductCommentResponse addProductComment(Long userId, Long productId, ProductCommentRequest request) {
        if (productCommentRepository == null) {
            throw new IllegalStateException("Product comment repository is not available");
        }
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + request.getOrderId()));
        if (!order.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Order does not belong to this user");
        }
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new IllegalStateException("Only delivered orders can be reviewed");
        }
        boolean purchased = order.getItems().stream()
                .anyMatch(item -> item.getProductId().equals(productId));
        if (!purchased) {
            throw new IllegalStateException("Only customers who bought this product can comment");
        }

        ProductComment productComment = new ProductComment();
        productComment.setProductId(productId);
        productComment.setUserId(userId);
        productComment.setOrderId(request.getOrderId());
        productComment.setRating(request.getRating());
        productComment.setComment(request.getComment().strip());
        return ProductCommentResponse.from(productCommentRepository.save(productComment));
    }

    public List<ProductCommentResponse> getProductComments(Long productId) {
        if (productCommentRepository == null) {
            return List.of();
        }
        return productCommentRepository.findByProductIdOrderByCreatedAtDesc(productId).stream()
                .map(ProductCommentResponse::from)
                .collect(Collectors.toList());
    }

    public List<ProductCommentResponse> getOrderComments(Long orderId) {
        if (productCommentRepository == null) {
            return List.of();
        }
        return productCommentRepository.findByOrderIdOrderByCreatedAtDesc(orderId).stream()
                .map(ProductCommentResponse::from)
                .collect(Collectors.toList());
    }

    public ProductDetailWithCommentsDto getProductDetailWithComments(Long productId) {
        if (productServiceClient == null || productCommentRepository == null) {
            return null;
        }

        ProductSnapshotDto product = productServiceClient.getProduct(productId);
        if (product == null) {
            return null;
        }

        List<ProductCommentResponse> comments = getProductComments(productId);

        // Calculate statistics
        Integer totalComments = comments.size();
        Double averageRating = totalComments > 0
                ? comments.stream().mapToInt(ProductCommentResponse::getRating).average().orElse(0.0)
                : 0.0;

        Integer ratingCount1Star = (int) comments.stream().filter(c -> c.getRating() == 1).count();
        Integer ratingCount2Star = (int) comments.stream().filter(c -> c.getRating() == 2).count();
        Integer ratingCount3Star = (int) comments.stream().filter(c -> c.getRating() == 3).count();
        Integer ratingCount4Star = (int) comments.stream().filter(c -> c.getRating() == 4).count();
        Integer ratingCount5Star = (int) comments.stream().filter(c -> c.getRating() == 5).count();

        ProductDetailWithCommentsDto result = new ProductDetailWithCommentsDto();
        result.setProductId(product.getId());
        result.setProductName(product.getName());
        result.setDescription(product.getDescription());
        result.setPrice(product.getPrice());
        result.setStockQuantity(product.getStockQuantity());
        result.setImageUrl(product.getImageUrl());
        result.setDescriptionImageUrls(product.getDescriptionImageUrls());
        result.setStatus(product.getStatus());
        result.setCategoryName(product.getCategoryName());
        result.setComments(comments);
        result.setTotalComments(totalComments);
        result.setAverageRating(averageRating);
        result.setRatingCount1Star(ratingCount1Star);
        result.setRatingCount2Star(ratingCount2Star);
        result.setRatingCount3Star(ratingCount3Star);
        result.setRatingCount4Star(ratingCount4Star);
        result.setRatingCount5Star(ratingCount5Star);

        return result;
    }
}
