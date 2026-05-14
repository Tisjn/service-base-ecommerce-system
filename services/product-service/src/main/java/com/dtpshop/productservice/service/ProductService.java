package com.dtpshop.productservice.service;

import com.dtpshop.productservice.dto.CartItemRequest;
import com.dtpshop.productservice.dto.CartItemResponse;
import com.dtpshop.productservice.dto.CheckoutResponse;
import com.dtpshop.productservice.dto.InventoryRequest;
import com.dtpshop.productservice.dto.ProductRequest;
import com.dtpshop.productservice.dto.ProductUpdateRequest;
import com.dtpshop.productservice.model.Category;
import com.dtpshop.productservice.model.CartItem;
import com.dtpshop.productservice.model.Product;
import com.dtpshop.productservice.model.ProductStatus;
import com.dtpshop.productservice.repository.CategoryRepository;
import com.dtpshop.productservice.repository.ProductRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CartService cartService;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository,
            CartService cartService) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.cartService = cartService;
    }

    public Page<Product> listActiveProducts(Pageable pageable) {
        return productRepository.findAllByStatus(ProductStatus.ACTIVE, pageable);
    }

    public Page<Product> listProducts(Integer categoryId, ProductStatus status, String search, BigDecimal minPrice,
            BigDecimal maxPrice, Pageable pageable) {
        if (search != null) {
            search = search.strip();
            if (search.isEmpty()) {
                search = null;
            }
        }
        if (status == null) {
            status = ProductStatus.ACTIVE;
        }
        return productRepository.searchProducts(status, categoryId, search, minPrice, maxPrice, pageable);
    }

    @Cacheable(value = "products", key = "#id")
    public Product getProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
    }

    public Product getProductEntity(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
    }

    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public Product createProduct(ProductRequest request) {
        Product product = new Product();
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        product.setReservedQuantity(0);
        product.setImageUrl(request.getImageUrl());
        product.setStatus(request.getStatus() == null ? ProductStatus.ACTIVE
                : ProductStatus.valueOf(request.getStatus().toUpperCase()));
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found: " + request.getCategoryId()));
            product.setCategory(category);
        }
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());
        return productRepository.save(product);
    }

    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public Product updateProduct(Long id, ProductUpdateRequest request) {
        Product product = getProductEntity(id);
        if (request.getName() != null) {
            product.setName(request.getName());
        }
        if (request.getDescription() != null) {
            product.setDescription(request.getDescription());
        }
        if (request.getPrice() != null) {
            product.setPrice(request.getPrice());
        }
        if (request.getStockQuantity() != null) {
            if (request.getStockQuantity() < product.getReservedQuantity()) {
                throw new IllegalArgumentException("Cannot reduce stock below reserved quantity");
            }
            product.setStockQuantity(request.getStockQuantity());
        }
        if (request.getImageUrl() != null) {
            product.setImageUrl(request.getImageUrl());
        }
        if (request.getStatus() != null) {
            product.setStatus(ProductStatus.valueOf(request.getStatus().toUpperCase()));
        }
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found: " + request.getCategoryId()));
            product.setCategory(category);
        }
        product.updateTimestamp();
        return productRepository.save(product);
    }

    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public Product softDeleteProduct(Long id) {
        Product product = getProductEntity(id);
        if (product.getReservedQuantity() > 0 || cartService.isProductInCart(id)) {
            throw new IllegalStateException("Cannot delete product because it is reserved or present in a cart");
        }
        product.markDeleted();
        product.updateTimestamp();
        return productRepository.save(product);
    }

    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public Product updateStock(Long id, Integer stockQuantity) {
        Product product = getProductEntity(id);
        if (stockQuantity < product.getReservedQuantity()) {
            throw new IllegalArgumentException("New stock cannot be lower than reserved quantity");
        }
        product.setStockQuantity(stockQuantity);
        product.updateTimestamp();
        return productRepository.save(product);
    }

    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public CheckoutResponse checkoutCart(Long userId) {
        List<CartItem> cartItems = cartService.getCartItems(userId);
        if (cartItems.isEmpty()) {
            throw new IllegalStateException("Giỏ hàng trống");
        }

        for (CartItem item : cartItems) {
            Product product = getProductEntity(item.getProductId());
            if (product.getStatus() != ProductStatus.ACTIVE) {
                throw new IllegalStateException("Không thể checkout sản phẩm không hoạt động: " + product.getName());
            }
            if (item.getQuantity() > product.getAvailableQuantity()) {
                throw new IllegalStateException("Tồn kho không đủ cho sản phẩm: " + product.getName());
            }
        }

        List<CartItemResponse> reservedItems = cartItems.stream().map(item -> {
            Product product = getProductEntity(item.getProductId());
            product.setReservedQuantity(product.getReservedQuantity() + item.getQuantity());
            product.updateTimestamp();
            productRepository.save(product);
            return CartItemResponse.from(item);
        }).collect(Collectors.toList());

        BigDecimal totalAmount = reservedItems.stream()
                .map(CartItemResponse::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        cartService.clearCart(userId);
        return new CheckoutResponse(reservedItems, totalAmount, "Checkout thành công, tồn kho đã được giữ");
    }

    @Transactional
    public void reserveInventory(InventoryRequest request) {
        if (request == null || request.getItems().isEmpty()) {
            return;
        }
        for (CartItemRequest item : request.getItems()) {
            Product product = getProductEntity(item.getProductId());
            if (product.getStatus() != ProductStatus.ACTIVE) {
                throw new IllegalStateException("Cannot reserve inventory for inactive product: " + product.getName());
            }
            if (item.getQuantity() > product.getAvailableQuantity()) {
                throw new IllegalStateException("Insufficient inventory for product: " + product.getName());
            }
            product.setStockQuantity(product.getStockQuantity() - item.getQuantity());
            product.updateTimestamp();
            productRepository.save(product);
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
                productRepository.save(product);
            });
        }
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
