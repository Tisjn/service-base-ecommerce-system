package com.dtpshop.orderservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StatusUpdateDto {
    @NotBlank
    private String status;
}
