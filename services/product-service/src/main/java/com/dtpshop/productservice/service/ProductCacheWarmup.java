package com.dtpshop.productservice.service;

import com.dtpshop.productservice.model.ProductStatus;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class ProductCacheWarmup {

    private static final Logger logger = LoggerFactory.getLogger(ProductCacheWarmup.class);

    private final ProductQueryService productQueryService;
    private final CategoryService categoryService;
    private final boolean enabled;

    public ProductCacheWarmup(ProductQueryService productQueryService, CategoryService categoryService,
            @Value("${product.cache.warmup-enabled:true}") boolean enabled) {
        this.productQueryService = productQueryService;
        this.categoryService = categoryService;
        this.enabled = enabled;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void warmup() {
        if (!enabled) {
            return;
        }
        try {
            Sort newestFirst = Sort.by(Sort.Direction.DESC, "createdAt");
            categoryService.listCategories();
            productQueryService.listProducts(null, ProductStatus.ACTIVE, null, null, null,
                    PageRequest.of(0, 10, newestFirst));
            productQueryService.listProducts(null, ProductStatus.ACTIVE, null, null, new BigDecimal("50000"),
                    PageRequest.of(0, 9, newestFirst));
            logger.info("Product read cache warmup completed");
        } catch (RuntimeException e) {
            logger.warn("Product read cache warmup skipped: {}", e.getMessage());
        }
    }
}
