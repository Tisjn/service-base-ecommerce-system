package com.dtpshop.orderservice.service.state;

import com.dtpshop.orderservice.model.OrderStatus;
import org.springframework.stereotype.Component;

@Component
public class ConfirmedState implements OrderState {

    @Override
    public OrderStatus status() {
        return OrderStatus.CONFIRMED;
    }

    @Override
    public boolean canTransitionTo(OrderStatus nextStatus) {
        return nextStatus == OrderStatus.PROCESSING || nextStatus == OrderStatus.CANCELLED;
    }
}
