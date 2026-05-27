package com.dtpshop.productservice.service;

import com.dtpshop.productservice.dto.CartItemRequest;
import com.dtpshop.productservice.dto.CartItemResponse;
import com.dtpshop.productservice.dto.CheckoutResponse;
import com.dtpshop.productservice.dto.InventoryRequest;
import com.dtpshop.productservice.model.CartItem;
import com.dtpshop.productservice.model.Product;
import com.dtpshop.productservice.model.ProductStatus;
import com.dtpshop.productservice.repository.ProductRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class InventoryService {

    private final ProductRepository productRepository;
    private final ProductQueryService productQueryService;
    private final CartService cartService;
    private final EventOutboxService eventOutboxService;

    @Autowired
    public InventoryService(ProductRepository productRepository, ProductQueryService productQueryService,
            CartService cartService, EventOutboxService eventOutboxService) {
        this.productRepository = productRepository;
        this.productQueryService = productQueryService;
        this.cartService = cartService;
        this.eventOutboxService = eventOutboxService;
    }

    InventoryService(ProductRepository productRepository, ProductQueryService productQueryService,
            CartService cartService) {
        this(productRepository, productQueryService, cartService, null);
    }

    @Transactional
    public CheckoutResponse checkoutCart(Long userId) {
        List<CartItem> cartItems = cartService.getCartItems(userId);
        if (cartItems.isEmpty()) {
            throw new IllegalStateException("Giá» hÃ ng trá»‘ng");
        }

        for (CartItem item : cartItems) {
            Product product = productQueryService.getProductEntity(item.getProductId());
            if (product.getStatus() != ProductStatus.ACTIVE) {
                throw new IllegalStateException("KhÃ´ng thá»ƒ checkout sáº£n pháº©m khÃ´ng hoáº¡t Ä‘á»™ng: " + product.getName());
            }
            if (item.getQuantity() > product.getAvailableQuantity()) {
                throw new IllegalStateException("Tá»“n kho khÃ´ng Ä‘á»§ cho sáº£n pháº©m: " + product.getName());
            }
        }

        List<CartItemResponse> reservedItems = cartItems.stream().map(item -> {
            Product product = productQueryService.getProductEntity(item.getProductId());
            product.setReservedQuantity(product.getReservedQuantity() + item.getQuantity());
            product.updateTimestamp();
            Product saved = productRepository.save(product);
            publishInventoryChanged(saved);
            return CartItemResponse.from(item);
        }).collect(Collectors.toList());

        BigDecimal totalAmount = reservedItems.stream()
                .map(CartItemResponse::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        cartService.clearCart(userId);
        return new CheckoutResponse(reservedItems, totalAmount, "Checkout thÃ nh cÃ´ng, tá»“n kho Ä‘Ã£ Ä‘Æ°á»£c giá»¯");
    }

    @Transactional
    public void reserveInventory(InventoryRequest request) {
        if (request == null || request.getItems().isEmpty()) {
            return;
        }
        for (CartItemRequest item : request.getItems()) {
            Product product = productQueryService.getProductEntity(item.getProductId());
            if (product.getStatus() != ProductStatus.ACTIVE) {
                throw new IllegalStateException("Cannot reserve inventory for inactive product: " + product.getName());
            }
            if (item.getQuantity() > product.getAvailableQuantity()) {
                throw new IllegalStateException("Insufficient inventory for product: " + product.getName());
            }
            product.setStockQuantity(product.getStockQuantity() - item.getQuantity());
            product.updateTimestamp();
            Product saved = productRepository.save(product);
            publishInventoryChanged(saved);
        }
    }

    @Transactional
    public void refundInventory(InventoryRequest request) {
        if (request == null || request.getItems().isEmpty()) {
            return;
        }
        for (CartItemRequest item : request.getItems()) {
            productRepository.findById(item.getProductId()).ifPresent(product -> {
                int refundQuantity = Math.max(0, item.getQuantity());
                product.setStockQuantity(product.getStockQuantity() + refundQuantity);
                product.updateTimestamp();
                Product saved = productRepository.save(product);
                publishInventoryChanged(saved);
            });
        }
    }

    private void publishInventoryChanged(Product product) {
        if (eventOutboxService != null) {
            eventOutboxService.inventoryChanged(product);
        }
    }
}
