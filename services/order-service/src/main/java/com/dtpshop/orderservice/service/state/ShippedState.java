package com.dtpshop.orderservice.service.state;

import com.dtpshop.orderservice.model.OrderStatus;
import org.springframework.stereotype.Component;

@Component
public class ShippedState implements OrderState {

    @Override
    public OrderStatus status() {
        return OrderStatus.SHIPPED;
    }

    @Override
    public boolean canTransitionTo(OrderStatus nextStatus) {
        return nextStatus == OrderStatus.DELIVERED;
    }
}
