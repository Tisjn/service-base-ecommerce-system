package com.dtpshop.orderservice.repository;

import com.dtpshop.orderservice.model.ProductComment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductCommentRepository extends JpaRepository<ProductComment, Long> {
    List<ProductComment> findByProductIdOrderByCreatedAtDesc(Long productId);

    List<ProductComment> findByOrderIdOrderByCreatedAtDesc(Long orderId);
}
