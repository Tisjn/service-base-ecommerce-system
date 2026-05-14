package com.dtpshop.productservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QuantityUpdateRequest {

    @NotNull
    @Min(1)
    private Integer quantity;
}
