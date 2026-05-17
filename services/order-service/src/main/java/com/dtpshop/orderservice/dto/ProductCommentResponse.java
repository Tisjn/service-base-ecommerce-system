package com.dtpshop.orderservice.dto;

import com.dtpshop.orderservice.model.ProductComment;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductCommentResponse {
    private Long id;
    private Long productId;
    private Long userId;
    private Long orderId;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;

    public static ProductCommentResponse from(ProductComment productComment) {
        return new ProductCommentResponse(
                productComment.getId(),
                productComment.getProductId(),
                productComment.getUserId(),
                productComment.getOrderId(),
                productComment.getRating(),
                productComment.getComment(),
                productComment.getCreatedAt());
    }
}
