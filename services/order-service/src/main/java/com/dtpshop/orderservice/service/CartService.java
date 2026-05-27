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

    public List<CartItemDto> getCart(String cartKey) {
        return cartRepository.getCart(cartKey);
    }

    public void addItem(String cartKey, CartItemDto item) {
        List<CartItemDto> items = new ArrayList<>(cartRepository.getCart(cartKey));
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
        cartRepository.saveCart(cartKey, items);
    }

    public void updateItem(String cartKey, Long productId, Integer quantity) {
        List<CartItemDto> items = new ArrayList<>(cartRepository.getCart(cartKey));
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
        cartRepository.saveCart(cartKey, items);
    }

    public void removeItem(String cartKey, Long productId) {
        List<CartItemDto> items = new ArrayList<>(cartRepository.getCart(cartKey));
        items.removeIf(item -> item.getProductId().equals(productId));
        cartRepository.saveCart(cartKey, items);
    }

    public void removeItems(String cartKey, List<CartItemDto> orderedItems) {
        if (cartKey == null || CollectionUtils.isEmpty(orderedItems)) {
            return;
        }

        List<Long> orderedProductIds = orderedItems.stream()
                .map(CartItemDto::getProductId)
                .filter(productId -> productId != null)
                .toList();
        if (orderedProductIds.isEmpty()) {
            return;
        }

        List<CartItemDto> items = new ArrayList<>(cartRepository.getCart(cartKey));
        items.removeIf(item -> orderedProductIds.contains(item.getProductId()));
        cartRepository.saveCart(cartKey, items);
    }

    public void clearCart(String cartKey) {
        cartRepository.clearCart(cartKey);
    }

    public void mergeCart(String sourceCartKey, String targetCartKey) {
        if (sourceCartKey == null || targetCartKey == null || sourceCartKey.equals(targetCartKey)) {
            return;
        }

        // Giỏ nguồn là guest:<sessionId>, giỏ đích là <userId>.
        List<CartItemDto> sourceItems = new ArrayList<>(cartRepository.getCart(sourceCartKey));
        if (sourceItems.isEmpty()) {
            return;
        }

        List<CartItemDto> targetItems = new ArrayList<>(cartRepository.getCart(targetCartKey));
        for (CartItemDto sourceItem : sourceItems) {
            boolean merged = false;
            for (CartItemDto targetItem : targetItems) {
                if (targetItem.getProductId().equals(sourceItem.getProductId())) {
                    // Nếu hai giỏ có cùng sản phẩm thì giữ một dòng và cộng số lượng.
                    targetItem.setQuantity((targetItem.getQuantity() == null ? 0 : targetItem.getQuantity())
                            + (sourceItem.getQuantity() == null ? 0 : sourceItem.getQuantity()));
                    targetItem.setPrice(sourceItem.getPrice());
                    merged = true;
                    break;
                }
            }
            if (!merged) {
                targetItems.add(sourceItem);
            }
        }

        // Lưu giỏ user sau khi gộp, rồi xóa giỏ guest cũ.
        cartRepository.saveCart(targetCartKey, targetItems);
        cartRepository.clearCart(sourceCartKey);
    }
}
