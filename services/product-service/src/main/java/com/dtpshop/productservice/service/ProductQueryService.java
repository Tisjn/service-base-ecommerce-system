package com.dtpshop.productservice.service;

import com.dtpshop.productservice.model.Product;
import com.dtpshop.productservice.model.ProductStatus;
import com.dtpshop.productservice.repository.ProductRepository;
import java.math.BigDecimal;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ProductQueryService {

    private final ProductRepository productRepository;

    public ProductQueryService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Cacheable(value = "product-lists", key = "'active:' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort.toString()")
    public Page<Product> listActiveProducts(Pageable pageable) {
        return productRepository.findAllByStatus(ProductStatus.ACTIVE, pageable);
    }

    @Cacheable(value = "product-lists", key = "'list:' + (#categoryId == null ? 'all' : #categoryId) + ':' + (#status == null ? 'ACTIVE' : #status.name()) + ':' + (#search == null ? '' : #search) + ':' + (#minPrice == null ? '' : #minPrice.toPlainString()) + ':' + (#maxPrice == null ? '' : #maxPrice.toPlainString()) + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort.toString()")
    public Page<Product> listProducts(Integer categoryId, ProductStatus status, String search, BigDecimal minPrice,
            BigDecimal maxPrice, Pageable pageable) {
        String normalizedSearch = normalizeSearch(search);
        ProductStatus effectiveStatus = status == null ? ProductStatus.ACTIVE : status;
        return productRepository.searchProducts(effectiveStatus, categoryId, normalizedSearch, minPrice, maxPrice,
                pageable);
    }

    @Cacheable(value = "product-details", key = "#id")
    public Product getProduct(Long id) {
        return getProductEntity(id);
    }

    public Product getProductEntity(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
    }

    private String normalizeSearch(String search) {
        if (search == null) {
            return null;
        }
        String stripped = search.strip();
        return stripped.isEmpty() ? null : stripped;
    }
}
