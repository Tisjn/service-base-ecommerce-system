package com.dtpshop.orderservice.repository;

import com.dtpshop.orderservice.model.Order;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
        List<Order> findByUserId(Long userId);

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
