package com.dtpshop.orderservice.repository;

import com.dtpshop.orderservice.model.Order;
import com.dtpshop.orderservice.model.OrderStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
        List<Order> findByUserId(Long userId);

        Page<Order> findByUserId(Long userId, Pageable pageable);

        Page<Order> findByStatus(OrderStatus status, Pageable pageable);

        Page<Order> findByUserIdAndStatus(Long userId, OrderStatus status, Pageable pageable);

        Page<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

        Page<Order> findByStatusAndCreatedAtBetween(OrderStatus status, LocalDateTime start, LocalDateTime end,
                        Pageable pageable);

        @Query("""
                        select count(o) > 0
                        from Order o
                        join o.items i
                        where o.userId = :userId
                          and o.id = :orderId
                          and i.productId = :productId
                          and o.status <> com.dtpshop.orderservice.model.OrderStatus.CANCELLED
                        """)
        boolean existsPurchasedProductInOrder(@Param("userId") Long userId,
                        @Param("orderId") Long orderId,
                        @Param("productId") Long productId);

        @Query("""
                        select count(o) > 0
                        from Order o
                        join o.items i
                        where o.userId = :userId
                          and i.productId = :productId
                          and o.status <> com.dtpshop.orderservice.model.OrderStatus.CANCELLED
                        """)
        boolean existsPurchasedProduct(@Param("userId") Long userId, @Param("productId") Long productId);

        @Query("""
                        select count(o) > 0
                        from Order o
                        join o.items i
                        where i.productId = :productId
                          and o.status <> com.dtpshop.orderservice.model.OrderStatus.CANCELLED
                        """)
        boolean existsProductOrder(@Param("productId") Long productId);
}
