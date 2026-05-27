package com.dtpshop.productservice.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

final class ProductImageUrlCleaner {

    private ProductImageUrlCleaner() {
    }

    static List<String> clean(List<String> imageUrls) {
        if (imageUrls == null) {
            return new ArrayList<>();
        }
        return imageUrls.stream()
                .filter(url -> url != null && !url.isBlank())
                .map(String::strip)
                .distinct()
                .collect(Collectors.toCollection(ArrayList::new));
    }
}
