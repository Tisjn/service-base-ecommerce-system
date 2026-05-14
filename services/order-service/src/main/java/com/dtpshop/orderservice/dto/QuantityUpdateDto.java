package com.dtpshop.orderservice.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class QuantityUpdateDto {
    @Min(1)
    private Integer quantity;
}
