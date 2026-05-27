package com.dtpshop.orderservice.service.strategy;

import java.math.BigDecimal;

public interface ShippingFeeStrategy {

    BigDecimal calculate(BigDecimal subtotal);
}
