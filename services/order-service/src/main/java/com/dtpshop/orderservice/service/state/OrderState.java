package com.dtpshop.orderservice.service.state;

import com.dtpshop.orderservice.model.OrderStatus;

public interface OrderState {

    OrderStatus status();

    boolean canTransitionTo(OrderStatus nextStatus);
}
