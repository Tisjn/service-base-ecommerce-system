package com.dtpshop.productservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StockUpdateRequest {

    @NotNull
    @Min(0)
    private Integer stockQuantity;
}
