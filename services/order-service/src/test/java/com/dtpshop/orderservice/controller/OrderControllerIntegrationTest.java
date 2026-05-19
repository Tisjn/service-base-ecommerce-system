package com.dtpshop.orderservice.controller;

import com.dtpshop.orderservice.dto.CartItemDto;
import com.dtpshop.orderservice.dto.OrderRequestDto;
import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderStatus;
import com.dtpshop.orderservice.service.CartService;
import com.dtpshop.orderservice.service.OrderService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
@ActiveProfiles("test")
class OrderControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CartService cartService;

    @MockBean
    private OrderService orderService;

    @Test
    void shouldAddCartItem() throws Exception {
        String payload = "{\"productId\":100,\"productName\":\"Suitcase\",\"quantity\":2,\"price\":49.99}";
        mockMvc.perform(post("/api/cart/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated());

        verify(cartService).addItem(argThat(key -> key != null && key.startsWith("guest:")), any(CartItemDto.class));
    }

    @Test
    void shouldGetCartItems() throws Exception {
        when(cartService.getCart(argThat(key -> key != null && key.startsWith("guest:")))).thenReturn(List.of(
                new CartItemDto(100L, "Suitcase", 2, new BigDecimal("49.99"))));

        mockMvc.perform(get("/api/cart"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productId").value(100))
                .andExpect(jsonPath("$[0].productName").value("Suitcase"))
                .andExpect(jsonPath("$[0].quantity").value(2));
    }

    @Test
    void shouldUpdateCartItemQuantity() throws Exception {
        String payload = "{\"quantity\":3}";

        mockMvc.perform(patch("/api/cart/items/100")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isNoContent());

        verify(cartService).updateItem(argThat(key -> key != null && key.startsWith("guest:")), eq(100L), eq(3));
    }

    @Test
    void shouldRemoveCartItem() throws Exception {
        mockMvc.perform(delete("/api/cart/items/100"))
                .andExpect(status().isNoContent());

        verify(cartService).removeItem(argThat(key -> key != null && key.startsWith("guest:")), eq(100L));
    }

    @Test
    void shouldClearCart() throws Exception {
        mockMvc.perform(delete("/api/cart"))
                .andExpect(status().isNoContent());

        verify(cartService).clearCart(argThat(key -> key != null && key.startsWith("guest:")));
    }

    @Test
    void shouldCreateOrder() throws Exception {
        Order order = new Order();
        order.setId(1L);
        order.setUserId(1L);
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(new BigDecimal("99.98"));

        when(orderService.createOrder(eq(1L), eq("1"), any(), any(OrderRequestDto.class))).thenReturn(order);

        String payload = "{\"addressId\":10,\"note\":\"123 Test Street\"}";
        mockMvc.perform(post("/api/orders?userId=1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.orderId").value(1))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void shouldCreateOrderForUserPathVariable() throws Exception {
        Order order = new Order();
        order.setId(2L);
        order.setUserId(2L);
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(new BigDecimal("199.96"));

        when(orderService.createOrder(eq(2L), eq("2"), any(), any(OrderRequestDto.class))).thenReturn(order);

        String payload = "{\"addressId\":20,\"note\":\"456 Another St\"}";
        mockMvc.perform(post("/api/orders/2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.orderId").value(2))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }
}
