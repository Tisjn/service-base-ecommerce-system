package com.dtpshop.productservice.repository;

import com.dtpshop.productservice.model.CartItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    List<CartItem> findByUserId(String userId);

    Optional<CartItem> findByUserIdAndProductId(String userId, Long productId);

    boolean existsByProductId(Long productId);

    void deleteByUserIdAndProductId(String userId, Long productId);

    void deleteByUserId(String userId);
}
