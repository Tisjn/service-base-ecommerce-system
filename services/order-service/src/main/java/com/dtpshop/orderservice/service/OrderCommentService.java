package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.client.ProductServiceClient;
import com.dtpshop.orderservice.dto.OrderProductDetailDto;
import com.dtpshop.orderservice.dto.ProductCommentRequest;
import com.dtpshop.orderservice.dto.ProductCommentResponse;
import com.dtpshop.orderservice.dto.ProductDetailWithCommentsDto;
import com.dtpshop.orderservice.dto.ProductSnapshotDto;
import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderStatus;
import com.dtpshop.orderservice.model.ProductComment;
import com.dtpshop.orderservice.repository.OrderRepository;
import com.dtpshop.orderservice.repository.ProductCommentRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderCommentService {

    private final OrderRepository orderRepository;
    private final ProductCommentRepository productCommentRepository;
    private final ProductServiceClient productServiceClient;

    public OrderCommentService(OrderRepository orderRepository,
            ProductCommentRepository productCommentRepository,
            ProductServiceClient productServiceClient) {
        this.orderRepository = orderRepository;
        this.productCommentRepository = productCommentRepository;
        this.productServiceClient = productServiceClient;
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
        result.setTotalComments(comments.size());
        result.setAverageRating(comments.isEmpty()
                ? 0.0
                : comments.stream().mapToInt(ProductCommentResponse::getRating).average().orElse(0.0));
        result.setRatingCount1Star((int) comments.stream().filter(c -> c.getRating() == 1).count());
        result.setRatingCount2Star((int) comments.stream().filter(c -> c.getRating() == 2).count());
        result.setRatingCount3Star((int) comments.stream().filter(c -> c.getRating() == 3).count());
        result.setRatingCount4Star((int) comments.stream().filter(c -> c.getRating() == 4).count());
        result.setRatingCount5Star((int) comments.stream().filter(c -> c.getRating() == 5).count());
        return result;
    }
}
