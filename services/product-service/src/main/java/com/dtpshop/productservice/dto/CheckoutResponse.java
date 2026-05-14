package com.dtpshop.productservice.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CheckoutResponse {

    private List<CartItemResponse> items;
    private BigDecimal totalAmount;
    private String message;
}
