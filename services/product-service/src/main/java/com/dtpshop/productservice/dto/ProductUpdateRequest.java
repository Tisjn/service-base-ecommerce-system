package com.dtpshop.productservice.dto;

import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class ProductUpdateRequest {

    private String name;
    private String description;

    @Min(0)
    private BigDecimal price;

    @Min(0)
    private Integer stockQuantity;

    private String imageUrl;
    private Integer categoryId;
    private String status;
}
