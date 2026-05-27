package com.dtpshop.orderservice.service.state;

import com.dtpshop.orderservice.model.OrderStatus;
import org.springframework.stereotype.Component;

@Component
public class DeliveredState implements OrderState {

    @Override
    public OrderStatus status() {
        return OrderStatus.DELIVERED;
    }

    @Override
    public boolean canTransitionTo(OrderStatus nextStatus) {
        return false;
    }
}
