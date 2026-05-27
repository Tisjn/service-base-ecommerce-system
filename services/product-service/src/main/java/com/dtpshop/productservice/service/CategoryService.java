package com.dtpshop.productservice.service;

import com.dtpshop.productservice.dto.CategoryRequest;
import com.dtpshop.productservice.dto.CategoryUpdateRequest;
import com.dtpshop.productservice.model.Category;
import com.dtpshop.productservice.repository.CategoryRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final EventOutboxService eventOutboxService;

    public CategoryService(CategoryRepository categoryRepository) {
        this(categoryRepository, null);
    }

    @Autowired
    public CategoryService(CategoryRepository categoryRepository, EventOutboxService eventOutboxService) {
        this.categoryRepository = categoryRepository;
        this.eventOutboxService = eventOutboxService;
    }

    @Cacheable(value = "categories", key = "'all'")
    public List<Category> listCategories() {
        return categoryRepository.findAll();
    }

    @Transactional
    @CacheEvict(value = { "categories", "product-lists", "product-details" }, allEntries = true)
    public Category createCategory(CategoryRequest request) {
        if (categoryRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Category name already exists: " + request.getName());
        }
        if (categoryRepository.existsBySlug(request.getSlug())) {
            throw new IllegalArgumentException("Category slug already exists: " + request.getSlug());
        }

        Category category = new Category();
        category.setName(request.getName());
        category.setSlug(request.getSlug());
        Category saved = categoryRepository.save(category);
        publishCategoryChanged(saved.getId());
        return saved;
    }

    @Transactional
    @CacheEvict(value = { "categories", "product-lists", "product-details" }, allEntries = true)
    public Category updateCategory(Integer id, CategoryUpdateRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + id));

        if (request.getName() != null && !request.getName().isBlank()) {
            if (!request.getName().equals(category.getName()) && categoryRepository.existsByName(request.getName())) {
                throw new IllegalArgumentException("Category name already exists: " + request.getName());
            }
            category.setName(request.getName());
        }
        if (request.getSlug() != null && !request.getSlug().isBlank()) {
            if (!request.getSlug().equals(category.getSlug()) && categoryRepository.existsBySlug(request.getSlug())) {
                throw new IllegalArgumentException("Category slug already exists: " + request.getSlug());
            }
            category.setSlug(request.getSlug());
        }
        Category saved = categoryRepository.save(category);
        publishCategoryChanged(saved.getId());
        return saved;
    }

    @Transactional
    @CacheEvict(value = { "categories", "product-lists", "product-details" }, allEntries = true)
    public void deleteCategory(Integer id) {
        if (!categoryRepository.existsById(id)) {
            throw new IllegalArgumentException("Category not found: " + id);
        }
        categoryRepository.deleteById(id);
        publishCategoryChanged(id);
    }

    private void publishCategoryChanged(Integer categoryId) {
        if (eventOutboxService != null) {
            eventOutboxService.categoryChanged(categoryId);
        }
    }
}
