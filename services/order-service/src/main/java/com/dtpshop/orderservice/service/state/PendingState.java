package com.dtpshop.orderservice.service.state;

import com.dtpshop.orderservice.model.OrderStatus;
import org.springframework.stereotype.Component;

@Component
public class PendingState implements OrderState {

    @Override
    public OrderStatus status() {
        return OrderStatus.PENDING;
    }

    @Override
    public boolean canTransitionTo(OrderStatus nextStatus) {
        return nextStatus == OrderStatus.CONFIRMED || nextStatus == OrderStatus.CANCELLED;
    }
}
