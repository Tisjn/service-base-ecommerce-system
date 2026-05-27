package com.dtpshop.productservice.service;

import com.dtpshop.productservice.client.OrderServiceClient;
import com.dtpshop.productservice.dto.CartItemRequest;
import com.dtpshop.productservice.dto.CartItemResponse;
import com.dtpshop.productservice.dto.CheckoutResponse;
import com.dtpshop.productservice.dto.InventoryRequest;
import com.dtpshop.productservice.dto.ProductRequest;
import com.dtpshop.productservice.dto.ProductUpdateRequest;
import com.dtpshop.productservice.model.Product;
import com.dtpshop.productservice.model.ProductStatus;
import com.dtpshop.productservice.repository.CategoryRepository;
import com.dtpshop.productservice.repository.ProductRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ProductService {

    private final ProductQueryService productQueryService;
    private final ProductCommandService productCommandService;
    private final InventoryService inventoryService;
    private final CartService cartService;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository,
            CartService cartService, OrderServiceClient orderServiceClient) {
        ProductQueryService queryService = new ProductQueryService(productRepository);
        this.productQueryService = queryService;
        this.productCommandService = new ProductCommandService(productRepository, categoryRepository, queryService,
                cartService, orderServiceClient);
        this.inventoryService = new InventoryService(productRepository, queryService, cartService);
        this.cartService = cartService;
    }

    @Autowired
    public ProductService(ProductQueryService productQueryService, ProductCommandService productCommandService,
            InventoryService inventoryService, CartService cartService) {
        this.productQueryService = productQueryService;
        this.productCommandService = productCommandService;
        this.inventoryService = inventoryService;
        this.cartService = cartService;
    }

    public Page<Product> listActiveProducts(Pageable pageable) {
        return productQueryService.listActiveProducts(pageable);
    }

    public Page<Product> listProducts(Integer categoryId, ProductStatus status, String search, BigDecimal minPrice,
            BigDecimal maxPrice, Pageable pageable) {
        return productQueryService.listProducts(categoryId, status, search, minPrice, maxPrice, pageable);
    }

    public Product getProduct(Long id) {
        return productQueryService.getProduct(id);
    }

    public Product getProductEntity(Long id) {
        return productQueryService.getProductEntity(id);
    }

    public Product createProduct(ProductRequest request) {
        return productCommandService.createProduct(request);
    }

    public Product updateProduct(Long id, ProductUpdateRequest request) {
        return productCommandService.updateProduct(id, request);
    }

    public Product softDeleteProduct(Long id) {
        return productCommandService.softDeleteProduct(id);
    }

    public Product restoreProduct(Long id) {
        return productCommandService.restoreProduct(id);
    }

    public void permanentlyDeleteProduct(Long id) {
        productCommandService.permanentlyDeleteProduct(id);
    }

    public Product updateStock(Long id, Integer stockQuantity) {
        return productCommandService.updateStock(id, stockQuantity);
    }

    public CheckoutResponse checkoutCart(Long userId) {
        return inventoryService.checkoutCart(userId);
    }

    public void reserveInventory(InventoryRequest request) {
        inventoryService.reserveInventory(request);
    }

    public void refundInventory(InventoryRequest request) {
        inventoryService.refundInventory(request);
    }

    public List<CartItemResponse> getCart(Long userId) {
        return cartService.getCart(userId);
    }

    public List<CartItemResponse> getCartByGuestToken(String guestToken) {
        return cartService.getCartByGuestToken(guestToken);
    }

    public void addCartItem(Long userId, CartItemRequest request) {
        cartService.addItem(userId, request);
    }

    public void addCartItemByGuestToken(String guestToken, CartItemRequest request) {
        cartService.addItemByGuestToken(guestToken, request);
    }

    public void updateCartItemQuantity(Long userId, Long productId, Integer quantity) {
        cartService.updateItemQuantity(userId, productId, quantity);
    }

    public void updateCartItemQuantityByGuestToken(String guestToken, Long productId, Integer quantity) {
        cartService.updateItemQuantityByGuestToken(guestToken, productId, quantity);
    }

    public void removeCartItem(Long userId, Long productId) {
        cartService.removeItem(userId, productId);
    }

    public void removeCartItemByGuestToken(String guestToken, Long productId) {
        cartService.removeItemByGuestToken(guestToken, productId);
    }

    public void mergeGuestCartToUser(String guestToken, Long userId) {
        cartService.mergeGuestCartToUser(guestToken, userId);
    }

    public void clearCart(Long userId) {
        cartService.clearCart(userId);
    }
}
