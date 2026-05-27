package com.dtpshop.orderservice.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.dtpshop.orderservice.client.PaymentServiceClient;
import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.repository.OrderRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class OrderQueryServiceTest {

    @Test
    void shouldNotCallPaymentServiceWhenListingCustomerOrders() {
        OrderRepository orderRepository = mock(OrderRepository.class);
        PaymentServiceClient paymentServiceClient = mock(PaymentServiceClient.class);
        when(orderRepository.findByUserId(1L)).thenReturn(List.of(new Order()));

        OrderQueryService queryService = new OrderQueryService(orderRepository, paymentServiceClient);

        queryService.findOrders(1L);

        verifyNoInteractions(paymentServiceClient);
    }

    @Test
    void shouldRefreshPaymentSnapshotWhenReadingSingleOrderDetail() {
        OrderRepository orderRepository = mock(OrderRepository.class);
        PaymentServiceClient paymentServiceClient = mock(PaymentServiceClient.class);
        Order order = new Order();
        order.setId(10L);
        when(orderRepository.findById(10L)).thenReturn(Optional.of(order));
        when(paymentServiceClient.getLatestPayment(10L))
                .thenReturn(new PaymentServiceClient.PaymentSnapshot("PAY-10", "MOMO", "PAID", "https://pay.test"));

        OrderQueryService queryService = new OrderQueryService(orderRepository, paymentServiceClient);

        queryService.getOrder(10L);

        verify(paymentServiceClient).getLatestPayment(10L);
    }
}
