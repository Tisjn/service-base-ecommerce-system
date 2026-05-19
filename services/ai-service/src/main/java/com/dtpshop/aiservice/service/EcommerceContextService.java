package com.dtpshop.aiservice.service;

import com.dtpshop.aiservice.config.AiContextProperties;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class EcommerceContextService {

    private final JdbcTemplate jdbcTemplate;
    private final AiContextProperties properties;

    public EcommerceContextService(JdbcTemplate jdbcTemplate, AiContextProperties properties) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
    }

    public EcommerceContext loadForUser(long userId) {
        List<Map<String, Object>> categories = jdbcTemplate.queryForList("""
                SELECT id, name, slug
                FROM categories
                ORDER BY name
                """);

        List<Map<String, Object>> products = jdbcTemplate.queryForList("""
                SELECT p.id,
                       p.name,
                       p.description,
                       p.price,
                       p.stock_quantity AS stockQuantity,
                       p.reserved_quantity AS reservedQuantity,
                       GREATEST(p.stock_quantity - p.reserved_quantity, 0) AS availableQuantity,
                       p.image_url AS imageUrl,
                       p.status,
                       c.name AS categoryName
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.deleted_at IS NULL
                ORDER BY p.updated_at DESC, p.id DESC
                LIMIT ?
                """, properties.productLimit());

        List<Map<String, Object>> orders = jdbcTemplate.queryForList("""
                SELECT id,
                       order_code AS orderCode,
                       order_status AS status,
                       subtotal,
                       shipping_fee AS shippingFee,
                       final_amount AS finalAmount,
                       note,
                       created_at AS createdAt,
                       updated_at AS updatedAt,
                       completed_at AS completedAt,
                       cancelled_at AS cancelledAt
                FROM orders
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """, userId, properties.orderLimit());

        List<Map<String, Object>> orderItems = jdbcTemplate.queryForList("""
                SELECT oi.id,
                       oi.order_id AS orderId,
                       o.order_code AS orderCode,
                       oi.product_id AS productId,
                       oi.product_name AS productName,
                       oi.quantity,
                       oi.price,
                       oi.subtotal
                FROM order_items oi
                INNER JOIN orders o ON o.id = oi.order_id
                WHERE o.user_id = ?
                ORDER BY o.created_at DESC, oi.id ASC
                LIMIT ?
                """, userId, Math.max(properties.orderLimit() * 10, 20));

        List<Map<String, Object>> faqPolicy = jdbcTemplate.queryForList("""
                SELECT id, question, answer, type, created_at AS createdAt
                FROM faq_policy
                ORDER BY id ASC
                LIMIT ?
                """, properties.faqLimit());

        return new EcommerceContext(categories, products, orders, orderItems, faqPolicy);
    }
}
