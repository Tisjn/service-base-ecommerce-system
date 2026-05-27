package com.dtpshop.orderservice.service.strategy;

import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public class StandardShippingFeeStrategy implements ShippingFeeStrategy {

    private static final BigDecimal FREE_SHIPPING_THRESHOLD = new BigDecimal("500000");
    private static final BigDecimal STANDARD_SHIPPING_FEE = new BigDecimal("10000");

    @Override
    public BigDecimal calculate(BigDecimal subtotal) {
        return subtotal.compareTo(FREE_SHIPPING_THRESHOLD) >= 0
                ? BigDecimal.ZERO
                : STANDARD_SHIPPING_FEE;
    }
}
