package com.dtpshop.orderservice.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderProductDetailDto {
    private ProductSnapshotDto product;
    private List<ProductCommentResponse> comments;
    private Boolean purchasedByUser;
}
