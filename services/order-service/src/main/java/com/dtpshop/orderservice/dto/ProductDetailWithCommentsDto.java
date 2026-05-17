package com.dtpshop.orderservice.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDetailWithCommentsDto {
    private Long productId;
    private String productName;
    private String description;
    private BigDecimal price;
    private Integer stockQuantity;
    private String imageUrl;
    private List<String> descriptionImageUrls;
    private String status;
    private String categoryName;

    // Comment statistics
    private List<ProductCommentResponse> comments;
    private Integer totalComments;
    private Double averageRating;
    private Integer ratingCount1Star;
    private Integer ratingCount2Star;
    private Integer ratingCount3Star;
    private Integer ratingCount4Star;
    private Integer ratingCount5Star;
}
