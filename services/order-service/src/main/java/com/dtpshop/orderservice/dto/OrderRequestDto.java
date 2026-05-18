package com.dtpshop.orderservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OrderRequestDto {
    @NotNull
    private Long addressId;

    private String paymentMethod = "COD";

    private String note;

    public void setShippingAddress(String shippingAddress) {
        this.note = shippingAddress;
    }
}
