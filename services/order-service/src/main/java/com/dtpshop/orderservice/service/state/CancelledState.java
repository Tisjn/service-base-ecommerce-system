package com.dtpshop.orderservice.service.state;

import com.dtpshop.orderservice.model.OrderStatus;
import org.springframework.stereotype.Component;

@Component
public class CancelledState implements OrderState {

    @Override
    public OrderStatus status() {
        return OrderStatus.CANCELLED;
    }

    @Override
    public boolean canTransitionTo(OrderStatus nextStatus) {
        return false;
    }
}
