package com.dtpshop.productservice.service;

import com.dtpshop.productservice.dto.CategoryRequest;
import com.dtpshop.productservice.dto.CategoryUpdateRequest;
import com.dtpshop.productservice.model.Category;
import com.dtpshop.productservice.repository.CategoryRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> listCategories() {
        return categoryRepository.findAll();
    }

    @Transactional
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
        return categoryRepository.save(category);
    }

    @Transactional
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
        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(Integer id) {
        if (!categoryRepository.existsById(id)) {
            throw new IllegalArgumentException("Category not found: " + id);
        }
        categoryRepository.deleteById(id);
    }
}
