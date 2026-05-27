package com.dtpshop.productservice.controller;

import com.dtpshop.productservice.dto.CartItemRequest;
import com.dtpshop.productservice.dto.CartItemResponse;
import com.dtpshop.productservice.dto.CategoryRequest;
import com.dtpshop.productservice.dto.CategoryUpdateRequest;
import com.dtpshop.productservice.dto.CheckoutResponse;
import com.dtpshop.productservice.dto.ImageUploadResponse;
import com.dtpshop.productservice.dto.ProductRequest;
import com.dtpshop.productservice.dto.ProductUpdateRequest;
import com.dtpshop.productservice.dto.QuantityUpdateRequest;
import com.dtpshop.productservice.dto.StockUpdateRequest;
import com.dtpshop.productservice.model.Category;
import com.dtpshop.productservice.model.Product;
import com.dtpshop.productservice.model.ProductStatus;
import com.dtpshop.productservice.service.CategoryService;
import com.dtpshop.productservice.service.CartService;
import com.dtpshop.productservice.service.ImageUploadService;
import com.dtpshop.productservice.service.InventoryService;
import com.dtpshop.productservice.service.ProductCommandService;
import com.dtpshop.productservice.service.ProductQueryService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class ProductController {

    private final ProductQueryService productQueryService;
    private final ProductCommandService productCommandService;
    private final InventoryService inventoryService;
    private final CartService cartService;
    private final CategoryService categoryService;
    private final ImageUploadService imageUploadService;

    public ProductController(ProductQueryService productQueryService, ProductCommandService productCommandService,
            InventoryService inventoryService, CartService cartService, CategoryService categoryService,
            ImageUploadService imageUploadService) {
        this.productQueryService = productQueryService;
        this.productCommandService = productCommandService;
        this.inventoryService = inventoryService;
        this.cartService = cartService;
        this.categoryService = categoryService;
        this.imageUploadService = imageUploadService;
    }

    @GetMapping("/products")
    public ResponseEntity<Page<Product>> getProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        if (page < 0 || size < 1) {
            throw new IllegalArgumentException("page must be >= 0 and size must be > 0");
        }
        ProductStatus productStatus = null;
        if (status != null && !status.isBlank()) {
            productStatus = ProductStatus.valueOf(status.toUpperCase());
        }
        String orderBy = switch (sortBy.toLowerCase()) {
            case "name" -> "name";
            case "price" -> "price";
            case "stock" -> "stockQuantity";
            case "createdat", "created_at" -> "createdAt";
            default -> "createdAt";
        };
        Sort.Direction sortDirection = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, orderBy));
        return ResponseEntity.ok(productQueryService.listProducts(categoryId, productStatus, search, minPrice,
                maxPrice, pageable));
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Long id) {
        return ResponseEntity.ok(productQueryService.getProduct(id));
    }

    @PostMapping("/product-images")
    public ResponseEntity<ImageUploadResponse> uploadProductImage(@RequestParam("file") MultipartFile file) {
        try {
            String imageUrl = imageUploadService.uploadProductImage(file);
            return ResponseEntity.status(HttpStatus.OK)
                    .body(new ImageUploadResponse(imageUrl, "Image uploaded successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ImageUploadResponse(null, e.getMessage(), false));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ImageUploadResponse(null, "Failed to upload image: " + e.getMessage(), false));
        }
    }

    @PostMapping("/products")
    public ResponseEntity<Product> createProduct(@Valid @RequestBody ProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productCommandService.createProduct(request));
    }

    @PatchMapping("/products/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id,
            @Valid @RequestBody ProductUpdateRequest request) {
        return ResponseEntity.ok(productCommandService.updateProduct(id, request));
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<Product> softDeleteProduct(@PathVariable Long id) {
        return ResponseEntity.ok(productCommandService.softDeleteProduct(id));
    }

    @PatchMapping("/products/{id}/restore")
    public ResponseEntity<Product> restoreProduct(@PathVariable Long id) {
        return ResponseEntity.ok(productCommandService.restoreProduct(id));
    }

    @DeleteMapping("/products/{id}/permanent")
    public ResponseEntity<Void> permanentlyDeleteProduct(@PathVariable Long id) {
        productCommandService.permanentlyDeleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/products/{id}/stock")
    public ResponseEntity<Product> updateStock(@PathVariable Long id,
            @Valid @RequestBody StockUpdateRequest request) {
        return ResponseEntity.ok(productCommandService.updateStock(id, request.getStockQuantity()));
    }

    @GetMapping("/cart/{userId}")
    public ResponseEntity<List<CartItemResponse>> getCart(@PathVariable String userId,
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        if ("guest".equals(userId) && guestToken != null) {
            return ResponseEntity.ok(cartService.getCartByGuestToken(guestToken));
        }
        try {
            Long userIdLong = Long.parseLong(userId);
            return ResponseEntity.ok(cartService.getCart(userIdLong));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/cart/{userId}/items")
    public ResponseEntity<Void> addCartItem(@PathVariable String userId,
            @Valid @RequestBody CartItemRequest request,
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        if ("guest".equals(userId) && guestToken != null) {
            cartService.addItemByGuestToken(guestToken, request);
        } else {
            try {
                Long userIdLong = Long.parseLong(userId);
                cartService.addItem(userIdLong, request);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PatchMapping("/cart/{userId}/items/{productId}")
    public ResponseEntity<Void> updateCartItem(@PathVariable String userId,
            @PathVariable Long productId,
            @Valid @RequestBody QuantityUpdateRequest request,
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        if ("guest".equals(userId) && guestToken != null) {
            cartService.updateItemQuantityByGuestToken(guestToken, productId, request.getQuantity());
        } else {
            try {
                Long userIdLong = Long.parseLong(userId);
                cartService.updateItemQuantity(userIdLong, productId, request.getQuantity());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/cart/{userId}/items/{productId}")
    public ResponseEntity<Void> removeCartItem(@PathVariable String userId,
            @PathVariable Long productId,
            @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        if ("guest".equals(userId) && guestToken != null) {
            cartService.removeItemByGuestToken(guestToken, productId);
        } else {
            try {
                Long userIdLong = Long.parseLong(userId);
                cartService.removeItem(userIdLong, productId);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/cart/{userId}")
    public ResponseEntity<Void> clearCart(@PathVariable Long userId) {
        cartService.clearCart(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/cart/merge")
    public ResponseEntity<Void> mergeGuestCart(@RequestHeader("X-Guest-Token") String guestToken,
            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long userId;
        try {
            userId = Long.parseLong(authentication.getName());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().build();
        }

        cartService.mergeGuestCartToUser(guestToken, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/cart/{userId}/checkout")
    public ResponseEntity<CheckoutResponse> checkoutCart(@PathVariable Long userId) {
        return ResponseEntity.ok(inventoryService.checkoutCart(userId));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getCategories() {
        return ResponseEntity.ok(categoryService.listCategories());
    }

    @PostMapping("/categories")
    public ResponseEntity<Category> createCategory(@Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.createCategory(request));
    }

    @PatchMapping("/categories/{id}")
    public ResponseEntity<Category> updateCategory(@PathVariable Integer id,
            @Valid @RequestBody CategoryUpdateRequest request) {
        return ResponseEntity.ok(categoryService.updateCategory(id, request));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Integer id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
