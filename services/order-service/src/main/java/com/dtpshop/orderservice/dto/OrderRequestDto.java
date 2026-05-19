package com.dtpshop.orderservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Email;
import lombok.Data;

@Data
public class OrderRequestDto {
    @NotNull
    private Long addressId;

    private String paymentMethod = "COD";

    private String note;

    @Email
    private String customerEmail;

    public void setShippingAddress(String shippingAddress) {
        this.note = shippingAddress;
    }
}
