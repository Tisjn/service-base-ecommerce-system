package com.dtpshop.orderservice.service.state;

import com.dtpshop.orderservice.model.OrderStatus;
import org.springframework.stereotype.Component;

@Component
public class ProcessingState implements OrderState {

    @Override
    public OrderStatus status() {
        return OrderStatus.PROCESSING;
    }

    @Override
    public boolean canTransitionTo(OrderStatus nextStatus) {
        return nextStatus == OrderStatus.SHIPPED || nextStatus == OrderStatus.CANCELLED;
    }
}
