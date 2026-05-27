package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.dto.CartItemDto;
import com.dtpshop.orderservice.dto.OrderRequestDto;
import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderStatus;
import com.dtpshop.orderservice.repository.OrderRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest(classes = OrderServiceIntegrationTest.TestConfig.class)
@ActiveProfiles("test")
class OrderServiceIntegrationTest {

    @Configuration
    static class TestConfig {
        @Bean
        public OrderService orderService(OrderRepository orderRepository,
                EventPublisherService eventPublisherService,
                CartService cartService) {
            return new OrderService(orderRepository, eventPublisherService, cartService);
        }
    }

    @Autowired
    private OrderService orderService;

    @MockBean
    private OrderRepository orderRepository;

    @MockBean
    private CartService cartService;

    @MockBean
    private EventPublisherService eventPublisherService;

    @Test
    void shouldCreatePendingCodOrderAndPublishSagaEvent() {
        when(cartService.getCart("1")).thenReturn(List.of(
                new CartItemDto(100L, "Suitcase", 2, new BigDecimal("49.99"))));

        OrderRequestDto requestDto = new OrderRequestDto();
        requestDto.setAddressId(10L);
        requestDto.setShippingAddress("123 Test Street");
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order savedOrder = invocation.getArgument(0);
            savedOrder.setId(1L);
            return savedOrder;
        });

        Order order = orderService.createOrder(1L, "1", "customer@example.com", requestDto);

        assertThat(order.getId()).isNotNull();
        assertThat(order.getTotalAmount()).isEqualByComparingTo(new BigDecimal("10099.98"));
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(order.getUserId()).isEqualTo(1L);
        assertThat(order.getItems()).hasSize(1);

        verify(orderRepository).save(any(Order.class));
        verify(cartService, never()).clearCart("1");
        verify(cartService).removeItems(eq("1"), anyList());
        verify(eventPublisherService).publishOrderCreated(any());
    }

    @Test
    void shouldCancelOrderAndPublishCancelledEvent() {
        Order existingOrder = new Order();
        existingOrder.setId(2L);
        existingOrder.setUserId(2L);
        existingOrder.setStatus(OrderStatus.PENDING);
        existingOrder.setTotalAmount(new BigDecimal("49.99"));

        when(orderRepository.findById(eq(2L))).thenReturn(java.util.Optional.of(existingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Order cancelled = orderService.cancelOrder(2L, "Customer requested cancellation", "corr-123");

        assertThat(cancelled.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(cancelled.getUpdatedAt()).isNotNull();

        verify(eventPublisherService)
                .publishOrderCancelled(any(com.dtpshop.orderservice.event.OrderCancelledEvent.class));
    }
}
