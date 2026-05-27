package com.dtpshop.orderservice.service.state;

import com.dtpshop.orderservice.model.OrderStatus;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class OrderStateMachine {

    private final Map<OrderStatus, OrderState> states = new EnumMap<>(OrderStatus.class);

    public OrderStateMachine(List<OrderState> orderStates) {
        orderStates.forEach(state -> states.put(state.status(), state));
    }

    public void validateTransition(OrderStatus currentStatus, OrderStatus nextStatus) {
        OrderState state = states.get(currentStatus);
        if (state == null || !state.canTransitionTo(nextStatus)) {
            throw new IllegalStateException("Invalid status transition: " + currentStatus + " -> " + nextStatus);
        }
    }
}
