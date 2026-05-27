package com.dtpshop.productservice.service;

import com.dtpshop.productservice.client.OrderServiceClient;
import com.dtpshop.productservice.dto.ProductRequest;
import com.dtpshop.productservice.dto.ProductUpdateRequest;
import com.dtpshop.productservice.model.Category;
import com.dtpshop.productservice.model.Product;
import com.dtpshop.productservice.model.ProductStatus;
import com.dtpshop.productservice.repository.CategoryRepository;
import com.dtpshop.productservice.repository.ProductRepository;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ProductCommandService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductQueryService productQueryService;
    private final CartService cartService;
    private final OrderServiceClient orderServiceClient;
    private final EventOutboxService eventOutboxService;

    @Autowired
    public ProductCommandService(ProductRepository productRepository, CategoryRepository categoryRepository,
            ProductQueryService productQueryService, CartService cartService, OrderServiceClient orderServiceClient,
            EventOutboxService eventOutboxService) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.productQueryService = productQueryService;
        this.cartService = cartService;
        this.orderServiceClient = orderServiceClient;
        this.eventOutboxService = eventOutboxService;
    }

    ProductCommandService(ProductRepository productRepository, CategoryRepository categoryRepository,
            ProductQueryService productQueryService, CartService cartService, OrderServiceClient orderServiceClient) {
        this(productRepository, categoryRepository, productQueryService, cartService, orderServiceClient, null);
    }

    @Transactional
    public Product createProduct(ProductRequest request) {
        Product product = new Product();
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setPurchasePrice(request.getPurchasePrice());
        product.setStockQuantity(request.getStockQuantity());
        product.setReservedQuantity(0);
        product.setImageUrl(request.getImageUrl());
        product.setDescriptionImageUrls(ProductImageUrlCleaner.clean(request.getDescriptionImageUrls()));
        product.setStatus(request.getStatus() == null ? ProductStatus.ACTIVE
                : ProductStatus.valueOf(request.getStatus().toUpperCase()));
        if (request.getCategoryId() != null) {
            product.setCategory(findCategory(request.getCategoryId()));
        }
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());
        Product saved = productRepository.save(product);
        publishProductCreated(saved);
        return saved;
    }

    @Transactional
    public Product updateProduct(Long id, ProductUpdateRequest request) {
        Product product = productQueryService.getProductEntity(id);
        if (request.getName() != null) {
            product.setName(request.getName());
        }
        if (request.getDescription() != null) {
            product.setDescription(request.getDescription());
        }
        if (request.getPrice() != null) {
            product.setPrice(request.getPrice());
        }
        if (request.getPurchasePrice() != null) {
            product.setPurchasePrice(request.getPurchasePrice());
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
        if (request.getDescriptionImageUrls() != null) {
            product.setDescriptionImageUrls(ProductImageUrlCleaner.clean(request.getDescriptionImageUrls()));
        }
        if (request.getStatus() != null) {
            product.setStatus(ProductStatus.valueOf(request.getStatus().toUpperCase()));
        }
        if (request.getCategoryId() != null) {
            product.setCategory(findCategory(request.getCategoryId()));
        }
        product.updateTimestamp();
        Product saved = productRepository.save(product);
        publishProductUpdated(saved);
        return saved;
    }

    @Transactional
    public Product softDeleteProduct(Long id) {
        Product product = productQueryService.getProductEntity(id);
        ensureProductCanBeRemoved(product,
                "KhÃ´ng thá»ƒ xÃ³a sáº£n pháº©m vÃ¬ sáº£n pháº©m Ä‘ang Ä‘Æ°á»£c giá»¯ hoáº·c cÃ³ trong giá» hÃ ng",
                "KhÃ´ng thá»ƒ xÃ³a sáº£n pháº©m vÃ¬ Ä‘Ã£ cÃ³ lá»‹ch sá»­ Ä‘Æ¡n hÃ ng");
        product.markDeleted();
        product.updateTimestamp();
        Product saved = productRepository.save(product);
        publishProductDeleted(saved);
        return saved;
    }

    @Transactional
    public Product restoreProduct(Long id) {
        Product product = productQueryService.getProductEntity(id);
        if (product.getStatus() != ProductStatus.HIDDEN) {
            throw new IllegalStateException("Chá»‰ cÃ³ thá»ƒ bá» áº©n sáº£n pháº©m Ä‘ang á»Ÿ tráº¡ng thÃ¡i áº©n");
        }
        product.setStatus(ProductStatus.ACTIVE);
        product.updateTimestamp();
        Product saved = productRepository.save(product);
        publishProductUpdated(saved);
        return saved;
    }

    @Transactional
    public void permanentlyDeleteProduct(Long id) {
        Product product = productQueryService.getProductEntity(id);
        if (product.getStatus() != ProductStatus.HIDDEN) {
            throw new IllegalStateException("Chá»‰ cÃ³ thá»ƒ xÃ³a vÄ©nh viá»…n sáº£n pháº©m Ä‘ang bá»‹ áº©n");
        }
        ensureProductCanBeRemoved(product,
                "KhÃ´ng thá»ƒ xÃ³a vÄ©nh viá»…n sáº£n pháº©m vÃ¬ sáº£n pháº©m Ä‘ang Ä‘Æ°á»£c giá»¯ hoáº·c cÃ³ trong giá» hÃ ng",
                "KhÃ´ng thá»ƒ xÃ³a vÄ©nh viá»…n sáº£n pháº©m vÃ¬ Ä‘Ã£ cÃ³ lá»‹ch sá»­ Ä‘Æ¡n hÃ ng");
        productRepository.delete(product);
        publishProductDeleted(product);
    }

    @Transactional
    public Product updateStock(Long id, Integer stockQuantity) {
        Product product = productQueryService.getProductEntity(id);
        if (stockQuantity < product.getReservedQuantity()) {
            throw new IllegalArgumentException("New stock cannot be lower than reserved quantity");
        }
        product.setStockQuantity(stockQuantity);
        product.updateTimestamp();
        Product saved = productRepository.save(product);
        publishInventoryChanged(saved);
        return saved;
    }

    private Category findCategory(Integer categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + categoryId));
    }

    private void ensureProductCanBeRemoved(Product product, String activeReferenceMessage, String orderHistoryMessage) {
        if (product.getReservedQuantity() > 0 || cartService.isProductInCart(product.getId())) {
            throw new IllegalStateException(activeReferenceMessage);
        }
        if (orderServiceClient.hasProductOrders(product.getId())) {
            throw new IllegalStateException(orderHistoryMessage);
        }
    }

    private void publishProductCreated(Product product) {
        if (eventOutboxService != null) {
            eventOutboxService.productCreated(product);
        }
    }

    private void publishProductUpdated(Product product) {
        if (eventOutboxService != null) {
            eventOutboxService.productUpdated(product);
        }
    }

    private void publishProductDeleted(Product product) {
        if (eventOutboxService != null) {
            eventOutboxService.productDeleted(product);
        }
    }

    private void publishInventoryChanged(Product product) {
        if (eventOutboxService != null) {
            eventOutboxService.inventoryChanged(product);
        }
    }
}
