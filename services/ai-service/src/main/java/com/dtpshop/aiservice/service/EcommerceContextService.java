package com.dtpshop.aiservice.service;

import com.dtpshop.aiservice.config.AiContextProperties;
import java.util.LinkedHashMap;
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
                       p.purchase_price AS purchasePrice,
                       p.stock_quantity AS stockQuantity,
                       p.reserved_quantity AS reservedQuantity,
                       GREATEST(p.stock_quantity - p.reserved_quantity, 0) AS availableQuantity,
                       p.image_url AS imageUrl,
                       p.status,
                       p.category_id AS categoryId,
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

        return new EcommerceContext(categories, products, orders, orderItems, faqPolicy, Map.of());
    }

    public EcommerceContext loadForAdmin() {
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
                       p.purchase_price AS purchasePrice,
                       p.stock_quantity AS stockQuantity,
                       p.reserved_quantity AS reservedQuantity,
                       GREATEST(p.stock_quantity - p.reserved_quantity, 0) AS availableQuantity,
                       p.image_url AS imageUrl,
                       p.status,
                       p.category_id AS categoryId,
                       c.name AS categoryName,
                       p.created_at AS createdAt,
                       p.updated_at AS updatedAt
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.deleted_at IS NULL
                ORDER BY p.updated_at DESC, p.id DESC
                LIMIT 500
                """);

        List<Map<String, Object>> orders = jdbcTemplate.queryForList("""
                SELECT id,
                       order_code AS orderCode,
                       user_id AS userId,
                       order_status AS status,
                       subtotal,
                       shipping_fee AS shippingFee,
                       final_amount AS finalAmount,
                       payment_method AS paymentMethod,
                       payment_status AS paymentStatus,
                       created_at AS createdAt,
                       updated_at AS updatedAt,
                       completed_at AS completedAt,
                       cancelled_at AS cancelledAt
                FROM orders
                ORDER BY created_at DESC
                LIMIT 500
                """);

        List<Map<String, Object>> orderItems = jdbcTemplate.queryForList("""
                SELECT oi.id,
                       oi.order_id AS orderId,
                       o.order_code AS orderCode,
                       oi.product_id AS productId,
                       oi.product_name AS productName,
                       oi.quantity,
                       oi.price,
                       oi.cost_price AS costPrice,
                       oi.subtotal
                FROM order_items oi
                INNER JOIN orders o ON o.id = oi.order_id
                ORDER BY o.created_at DESC, oi.id ASC
                LIMIT 1000
                """);

        List<Map<String, Object>> faqPolicy = jdbcTemplate.queryForList("""
                SELECT id, question, answer, type, created_at AS createdAt
                FROM faq_policy
                ORDER BY id ASC
                LIMIT ?
                """, properties.faqLimit());

        return new EcommerceContext(categories, products, orders, orderItems, faqPolicy, loadAdminDashboard());
    }

    public List<Map<String, Object>> findProductsForAgentLookup() {
        return jdbcTemplate.queryForList("""
                SELECT p.id,
                       p.name,
                       p.description,
                       p.price,
                       p.purchase_price AS purchasePrice,
                       p.stock_quantity AS stockQuantity,
                       p.image_url AS imageUrl,
                       p.status,
                       p.category_id AS categoryId,
                       c.name AS categoryName,
                       p.deleted_at AS deletedAt,
                       p.updated_at AS updatedAt
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                ORDER BY p.updated_at DESC, p.id DESC
                LIMIT 500
                """);
    }

    private Map<String, Object> loadAdminDashboard() {
        Map<String, Object> dashboard = new LinkedHashMap<>();
        Number pendingOnly = number("""
                SELECT COUNT(*) FROM orders WHERE UPPER(order_status) = 'PENDING'
                """);
        Number confirmed = number("""
                SELECT COUNT(*) FROM orders WHERE UPPER(order_status) = 'CONFIRMED'
                """);
        Number processing = number("""
                SELECT COUNT(*) FROM orders WHERE UPPER(order_status) = 'PROCESSING'
                """);
        Number shipped = number("""
                SELECT COUNT(*) FROM orders WHERE UPPER(order_status) = 'SHIPPED'
                """);
        Number completed = number("""
                SELECT COUNT(*) FROM orders WHERE UPPER(order_status) IN ('DELIVERED', 'COMPLETED')
                """);
        Number cancelled = number("""
                SELECT COUNT(*) FROM orders WHERE UPPER(order_status) IN ('CANCELLED', 'CANCELED')
                """);
        Map<String, Object> orderMetrics = new LinkedHashMap<>();
        orderMetrics.put("total", number("""
                SELECT COUNT(*) FROM orders
                """));
        orderMetrics.put("pending", number("""
                SELECT COUNT(*) FROM orders WHERE UPPER(order_status) IN ('PENDING', 'CONFIRMED', 'PROCESSING')
                """));
        orderMetrics.put("pendingOnly", pendingOnly);
        orderMetrics.put("confirmed", confirmed);
        orderMetrics.put("processing", processing);
        orderMetrics.put("shipped", shipped);
        orderMetrics.put("completed", completed);
        orderMetrics.put("delivered", completed);
        orderMetrics.put("cancelled", cancelled);
        orderMetrics.put("recent30Days", number("""
                SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                """));
        orderMetrics.put("byStatus", list("""
                SELECT COALESCE(UPPER(order_status), 'UNKNOWN') AS status, COUNT(*) AS count
                FROM orders
                GROUP BY COALESCE(UPPER(order_status), 'UNKNOWN')
                ORDER BY count DESC
                """));
        dashboard.put("orders", orderMetrics);
        dashboard.put("finance", Map.of(
                "revenue", decimal("""
                        SELECT COALESCE(SUM(final_amount), 0)
                        FROM orders
                        WHERE UPPER(order_status) IN ('DELIVERED', 'COMPLETED')
                        """),
                "revenue30Days", decimal("""
                        SELECT COALESCE(SUM(final_amount), 0)
                        FROM orders
                        WHERE UPPER(order_status) IN ('DELIVERED', 'COMPLETED')
                          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                        """),
                "revenue7Days", decimal("""
                        SELECT COALESCE(SUM(final_amount), 0)
                        FROM orders
                        WHERE UPPER(order_status) IN ('DELIVERED', 'COMPLETED')
                          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                        """),
                "grossProfit", decimal("""
                        SELECT COALESCE(SUM((oi.price - COALESCE(oi.cost_price, 0)) * oi.quantity), 0)
                        FROM order_items oi
                        INNER JOIN orders o ON o.id = oi.order_id
                        WHERE UPPER(o.order_status) IN ('DELIVERED', 'COMPLETED')
                        """),
                "paidRevenue", decimal("""
                        SELECT COALESCE(SUM(final_amount), 0)
                        FROM orders
                        WHERE UPPER(payment_status) IN ('PAID', 'SUCCESS', 'COMPLETED')
                           OR UPPER(order_status) IN ('DELIVERED', 'COMPLETED')
                        """)));
        dashboard.put("payments", Map.of(
                "paidOrders", number("""
                        SELECT COUNT(*) FROM orders WHERE UPPER(payment_status) IN ('PAID', 'SUCCESS', 'COMPLETED')
                        """),
                "failedPayments", number("""
                        SELECT COUNT(*) FROM orders WHERE UPPER(payment_status) IN ('FAILED', 'EXPIRED', 'CANCELLED', 'CANCELED')
                        """),
                "byMethod", list("""
                        SELECT COALESCE(payment_method, 'COD') AS method, COUNT(*) AS count
                        FROM orders
                        GROUP BY COALESCE(payment_method, 'COD')
                        ORDER BY count DESC
                        """),
                "byStatus", list("""
                        SELECT COALESCE(payment_status, 'PENDING') AS status, COUNT(*) AS count
                        FROM orders
                        GROUP BY COALESCE(payment_status, 'PENDING')
                        ORDER BY count DESC
                        """)));
        dashboard.put("customers", Map.of(
                "total", number("""
                        SELECT COUNT(*) FROM users WHERE COALESCE(deleted, false) = false
                        """),
                "new30Days", number("""
                        SELECT COUNT(*) FROM users
                        WHERE COALESCE(deleted, false) = false
                          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                        """),
                "active30Days", number("""
                        SELECT COUNT(DISTINCT user_id)
                        FROM orders
                        WHERE UPPER(order_status) NOT IN ('CANCELLED', 'CANCELED')
                          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                        """),
                "repeatCustomers", number("""
                        SELECT COUNT(*)
                        FROM (
                          SELECT user_id
                          FROM orders
                          WHERE UPPER(order_status) NOT IN ('CANCELLED', 'CANCELED')
                          GROUP BY user_id
                          HAVING COUNT(*) > 1
                        ) repeat_users
                        """),
                "topCustomers", list("""
                        SELECT o.user_id AS userId,
                               COALESCE(u.full_name, u.email, CONCAT('Customer #', o.user_id)) AS customerName,
                               COUNT(*) AS orderCount,
                               COALESCE(SUM(o.final_amount), 0) AS revenue,
                               MAX(o.created_at) AS lastOrderAt
                        FROM orders o
                        LEFT JOIN users u ON u.id = o.user_id
                        WHERE UPPER(o.order_status) NOT IN ('CANCELLED', 'CANCELED')
                        GROUP BY o.user_id, u.full_name, u.email
                        ORDER BY revenue DESC
                        LIMIT 5
                        """)));
        dashboard.put("products", Map.of(
                "total", number("""
                        SELECT COUNT(*) FROM products WHERE deleted_at IS NULL
                        """),
                "visible", number("""
                        SELECT COUNT(*) FROM products
                        WHERE deleted_at IS NULL
                          AND COALESCE(UPPER(status), 'ACTIVE') <> 'HIDDEN'
                        """),
                "hidden", number("""
                        SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND UPPER(status) = 'HIDDEN'
                        """),
                "lowStock", number("""
                        SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND stock_quantity <= 5
                        """),
                "outOfStock", number("""
                        SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND stock_quantity <= 0
                        """),
                "inventoryValue", decimal("""
                        SELECT COALESCE(SUM(price * stock_quantity), 0)
                        FROM products
                        WHERE deleted_at IS NULL
                        """),
                "profitableProducts", number("""
                        SELECT COUNT(*)
                        FROM products
                        WHERE deleted_at IS NULL AND price > purchase_price
                        """),
                "lowStockItems", list("""
                        SELECT id, name, stock_quantity AS stockQuantity, reserved_quantity AS reservedQuantity
                        FROM products
                        WHERE deleted_at IS NULL AND stock_quantity <= 5
                        ORDER BY stock_quantity ASC, id DESC
                        LIMIT 10
                        """),
                "byCategory", list("""
                        SELECT COALESCE(c.name, 'Chua phan loai') AS categoryName,
                               COUNT(p.id) AS count
                        FROM products p
                        LEFT JOIN categories c ON c.id = p.category_id
                        WHERE p.deleted_at IS NULL
                        GROUP BY COALESCE(c.name, 'Chua phan loai')
                        ORDER BY count DESC
                        """)));
        dashboard.put("reviews", Map.of(
                "totalComments", number("""
                        SELECT COUNT(*) FROM product_comments
                        """),
                "averageRating", decimal("""
                        SELECT COALESCE(AVG(rating), 0) FROM product_comments
                        """),
                "ratingBuckets", list("""
                        SELECT rating, COUNT(*) AS count
                        FROM product_comments
                        GROUP BY rating
                        ORDER BY rating DESC
                        """)));
        dashboard.put("recentOrders", list("""
                SELECT id,
                       order_code AS orderCode,
                       user_id AS userId,
                       order_status AS status,
                       final_amount AS finalAmount,
                       payment_method AS paymentMethod,
                       payment_status AS paymentStatus,
                       created_at AS createdAt
                FROM orders
                ORDER BY created_at DESC
                LIMIT 8
                """));
        dashboard.put("generatedAt", java.time.Instant.now().toString());
        return dashboard;
    }

    private Number number(String sql) {
        Number value = jdbcTemplate.queryForObject(sql, Number.class);
        return value == null ? 0 : value;
    }

    private Number decimal(String sql) {
        Number value = jdbcTemplate.queryForObject(sql, Number.class);
        return value == null ? 0 : value;
    }

    private List<Map<String, Object>> list(String sql) {
        return jdbcTemplate.queryForList(sql);
    }
}
