package com.dtpshop.productservice.service;

import com.dtpshop.productservice.model.Product;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

@Service
public class ProductCacheService {

    private final CacheManager cacheManager;

    public ProductCacheService(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    public void clearProductLists() {
        Cache listCache = cacheManager.getCache("product-lists");
        if (listCache != null) {
            listCache.clear();
        }
    }

    public void clearProductDetails() {
        Cache detailCache = cacheManager.getCache("product-details");
        if (detailCache != null) {
            detailCache.clear();
        }
    }

    public void evictProductDetail(Long productId) {
        Cache detailCache = cacheManager.getCache("product-details");
        if (detailCache != null && productId != null) {
            detailCache.evict(productId);
        }
    }

    public void putProductDetail(Long productId, Product product) {
        Cache detailCache = cacheManager.getCache("product-details");
        if (detailCache != null && productId != null && product != null) {
            detailCache.put(productId, product);
        }
    }
}
