package com.dtpshop.productservice.service;

import com.dtpshop.productservice.client.OrderServiceClient;
import com.dtpshop.productservice.dto.CartItemRequest;
import com.dtpshop.productservice.dto.CartItemResponse;
import com.dtpshop.productservice.model.CartItem;
import com.dtpshop.productservice.model.Product;
import com.dtpshop.productservice.repository.CartItemRepository;
import com.dtpshop.productservice.repository.ProductRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final OrderServiceClient orderServiceClient;

    public CartService(CartItemRepository cartItemRepository, ProductRepository productRepository,
            OrderServiceClient orderServiceClient) {
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.orderServiceClient = orderServiceClient;
    }

    public List<CartItemResponse> getCart(Long userId) {
        return cartItemRepository.findByUserId(userId.toString()).stream()
                .map(CartItemResponse::from)
                .collect(Collectors.toList());
    }

    public List<CartItemResponse> getCartByGuestToken(String guestToken) {
        return cartItemRepository.findByUserId("guest:" + guestToken).stream()
                .map(CartItemResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void addItem(Long userId, CartItemRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + request.getProductId()));
        if (product.getStatus() != null
                && product.getStatus() != com.dtpshop.productservice.model.ProductStatus.ACTIVE) {
            throw new IllegalArgumentException("Product is not available for cart: " + product.getName());
        }
        if (request.getQuantity() > product.getAvailableQuantity()) {
            throw new IllegalArgumentException("Insufficient stock for product: " + product.getName());
        }

        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId.toString(), request.getProductId())
                .orElseGet(CartItem::new);

        cartItem.setUserId(userId.toString());
        cartItem.setProductId(product.getId());
        cartItem.setProductName(product.getName());
        cartItem.setPrice(product.getPrice());
        cartItem.setQuantity(request.getQuantity());
        cartItemRepository.save(cartItem);
        orderServiceClient.syncAddOrUpdateCartItem(userId, cartItem);
    }

    @Transactional
    public void addItemByGuestToken(String guestToken, CartItemRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + request.getProductId()));
        if (product.getStatus() != null
                && product.getStatus() != com.dtpshop.productservice.model.ProductStatus.ACTIVE) {
            throw new IllegalArgumentException("Product is not available for cart: " + product.getName());
        }
        if (request.getQuantity() > product.getAvailableQuantity()) {
            throw new IllegalArgumentException("Insufficient stock for product: " + product.getName());
        }

        String guestUserId = "guest:" + guestToken;
        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(guestUserId, request.getProductId())
                .orElseGet(CartItem::new);

        cartItem.setUserId(guestUserId);
        cartItem.setProductId(product.getId());
        cartItem.setProductName(product.getName());
        cartItem.setPrice(product.getPrice());
        cartItem.setQuantity(request.getQuantity());
        cartItemRepository.save(cartItem);
        // Note: Guest cart not synced to order service
    }

    @Transactional
    public void updateItemQuantity(Long userId, Long productId, Integer quantity) {
        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId.toString(), productId)
                .orElseThrow(() -> new IllegalArgumentException("Cart item not found: " + productId));
        if (quantity <= 0) {
            cartItemRepository.delete(cartItem);
            orderServiceClient.syncRemoveCartItem(userId, productId);
            return;
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));
        if (quantity > product.getAvailableQuantity()) {
            throw new IllegalArgumentException("Insufficient stock for product: " + product.getName());
        }
        cartItem.setQuantity(quantity);
        cartItemRepository.save(cartItem);
        orderServiceClient.syncAddOrUpdateCartItem(userId, cartItem);
    }

    @Transactional
    public void updateItemQuantityByGuestToken(String guestToken, Long productId, Integer quantity) {
        String guestUserId = "guest:" + guestToken;
        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(guestUserId, productId)
                .orElseThrow(() -> new IllegalArgumentException("Cart item not found: " + productId));
        if (quantity <= 0) {
            cartItemRepository.delete(cartItem);
            return;
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));
        if (quantity > product.getAvailableQuantity()) {
            throw new IllegalArgumentException("Insufficient stock for product: " + product.getName());
        }
        cartItem.setQuantity(quantity);
        cartItemRepository.save(cartItem);
    }

    @Transactional
    public void removeItem(Long userId, Long productId) {
        cartItemRepository.deleteByUserIdAndProductId(userId.toString(), productId);
        orderServiceClient.syncRemoveCartItem(userId, productId);
    }

    @Transactional
    public void removeItemByGuestToken(String guestToken, Long productId) {
        String guestUserId = "guest:" + guestToken;
        cartItemRepository.deleteByUserIdAndProductId(guestUserId, productId);
    }

    @Transactional
    public void mergeGuestCartToUser(String guestToken, Long userId) {
        String guestUserId = "guest:" + guestToken;
        List<CartItem> guestItems = cartItemRepository.findByUserId(guestUserId);
        for (CartItem guestItem : guestItems) {
            CartItem existing = cartItemRepository.findByUserIdAndProductId(userId.toString(), guestItem.getProductId())
                    .orElseGet(CartItem::new);
            int mergedQuantity = guestItem.getQuantity();
            if (existing.getId() != null) {
                mergedQuantity += existing.getQuantity();
            }
            existing.setUserId(userId.toString());
            existing.setProductId(guestItem.getProductId());
            existing.setProductName(guestItem.getProductName());
            existing.setPrice(guestItem.getPrice());
            existing.setQuantity(mergedQuantity);
            cartItemRepository.save(existing);
            orderServiceClient.syncAddOrUpdateCartItem(userId, existing);
        }
        if (!guestItems.isEmpty()) {
            cartItemRepository.deleteByUserId(guestUserId);
        }
    }

    @Transactional
    public void clearCart(Long userId) {
        cartItemRepository.deleteByUserId(userId.toString());
        orderServiceClient.syncClearCart(userId);
    }

    public boolean isProductInCart(Long productId) {
        return cartItemRepository.existsByProductId(productId);
    }

    public List<CartItem> getCartItems(Long userId) {
        return cartItemRepository.findByUserId(userId.toString());
    }
}
