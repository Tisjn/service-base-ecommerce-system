package com.dtpshop.orderservice.service;

import com.dtpshop.orderservice.dto.CartItemDto;
import com.dtpshop.orderservice.repository.CartRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

@Service
public class CartService {

    private final CartRepository cartRepository;

    public CartService(CartRepository cartRepository) {
        this.cartRepository = cartRepository;
    }

    public List<CartItemDto> getCart(Long userId) {
        return cartRepository.getCart(userId.toString());
    }

    public void addItem(Long userId, CartItemDto item) {
        List<CartItemDto> items = new ArrayList<>(cartRepository.getCart(userId.toString()));
        boolean updated = false;
        for (CartItemDto existing : items) {
            if (existing.getProductId().equals(item.getProductId())) {
                existing.setQuantity(item.getQuantity());
                existing.setPrice(item.getPrice());
                updated = true;
                break;
            }
        }
        if (!updated) {
            items.add(item);
        }
        cartRepository.saveCart(userId.toString(), items);
    }

    public void updateItem(Long userId, Long productId, Integer quantity) {
        List<CartItemDto> items = new ArrayList<>(cartRepository.getCart(userId.toString()));
        if (CollectionUtils.isEmpty(items)) {
            return;
        }
        items.removeIf(item -> item.getProductId().equals(productId) && quantity != null && quantity <= 0);
        for (CartItemDto item : items) {
            if (item.getProductId().equals(productId) && quantity != null && quantity > 0) {
                item.setQuantity(quantity);
                break;
            }
        }
        cartRepository.saveCart(userId.toString(), items);
    }

    public void removeItem(Long userId, Long productId) {
        List<CartItemDto> items = new ArrayList<>(cartRepository.getCart(userId.toString()));
        items.removeIf(item -> item.getProductId().equals(productId));
        cartRepository.saveCart(userId.toString(), items);
    }

    public void clearCart(Long userId) {
        cartRepository.clearCart(userId.toString());
    }
}
