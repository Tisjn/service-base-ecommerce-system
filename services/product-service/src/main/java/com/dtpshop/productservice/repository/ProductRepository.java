package com.dtpshop.productservice.repository;

import com.dtpshop.productservice.model.Product;
import com.dtpshop.productservice.model.ProductStatus;
import java.math.BigDecimal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    java.util.List<Product> findAllByStatus(ProductStatus status);

    Page<Product> findAllByStatus(ProductStatus status, Pageable pageable);

    @Query("SELECT p FROM Product p "
            + "WHERE p.status = :status "
            + "AND (:categoryId IS NULL OR p.category.id = :categoryId) "
            + "AND (:search IS NULL OR lower(p.name) LIKE lower(concat('%', :search, '%')) "
            + "OR lower(p.description) LIKE lower(concat('%', :search, '%'))) "
            + "AND (:minPrice IS NULL OR p.price >= :minPrice) "
            + "AND (:maxPrice IS NULL OR p.price <= :maxPrice)")
    Page<Product> searchProducts(@Param("status") ProductStatus status,
            @Param("categoryId") Integer categoryId,
            @Param("search") String search,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable);
}
