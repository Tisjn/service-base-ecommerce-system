package com.dtpshop.orderservice.service;

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

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final EventPublisherService eventPublisherService;
    private final CartService cartService;
    private final ProductServiceClient productServiceClient;
    private final ProductCommentRepository productCommentRepository;
    private final OrderWebSocketNotifier orderWebSocketNotifier;

    @Autowired
    public OrderService(OrderRepository orderRepository,
            EventPublisherService eventPublisherService,
            CartService cartService,
            ProductServiceClient productServiceClient,
            ProductCommentRepository productCommentRepository,
            OrderWebSocketNotifier orderWebSocketNotifier) {
        this.orderRepository = orderRepository;
        this.eventPublisherService = eventPublisherService;
        this.cartService = cartService;
        this.productServiceClient = productServiceClient;
        this.productCommentRepository = productCommentRepository;
        this.orderWebSocketNotifier = orderWebSocketNotifier;
    }

    public OrderService(OrderRepository orderRepository,
            EventPublisherService eventPublisherService,
            CartService cartService) {
        this(orderRepository, eventPublisherService, cartService, null, null, null);
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

        final List<CartItemDto> itemsToProcess = cartItems;

        Order order = new Order();
        order.setUserId(userId);
        order.setShippingAddress(requestDto.getShippingAddress());
        order.setStatus(OrderStatus.PENDING);

        BigDecimal total = itemsToProcess.stream()
                .map(CartItemDto::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setTotalAmount(total);

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
        // Publish OrderCreated event to other services via AMQP
        if (eventPublisherService != null) {
            com.dtpshop.orderservice.event.OrderCreatedEvent evt = new com.dtpshop.orderservice.event.OrderCreatedEvent(
                    pendingOrder.getId(),
                    pendingOrder.getUserId(),
                    pendingOrder.getShippingAddress(),
                    itemsToProcess,
                    pendingOrder.getTotalAmount(),
                    "order-" + pendingOrder.getId(),
                    pendingOrder.getCreatedAt());
            eventPublisherService.publishOrderCreated(evt);
        }
        // Notify connected admin clients via WebSocket
        if (orderWebSocketNotifier != null) {
            com.dtpshop.orderservice.dto.OrderResponseDto notifyDto = new com.dtpshop.orderservice.dto.OrderResponseDto(
                    pendingOrder.getId(), pendingOrder.getUserId(), pendingOrder.getStatus(),
                    pendingOrder.getTotalAmount(),
                    pendingOrder.getShippingAddress(), pendingOrder.getCreatedAt(), pendingOrder.getUpdatedAt(),
                    itemsToProcess);
            orderWebSocketNotifier.notifyNewOrder(notifyDto);
        }
        if (productServiceClient != null) {
            boolean reserved = productServiceClient.reserveInventory(itemsToProcess, "order-" + pendingOrder.getId());
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
        return orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    public Order getOrder(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
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

    public OrderProductDetailDto getOrderProductDetail(Long userId, Long productId) {
        ProductSnapshotDto product = productServiceClient == null ? null : productServiceClient.getProduct(productId);
        List<ProductCommentResponse> comments = getProductComments(productId);
        boolean purchased = userId != null && orderRepository.existsPurchasedProduct(userId, productId);
        return new OrderProductDetailDto(product, comments, purchased);
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
