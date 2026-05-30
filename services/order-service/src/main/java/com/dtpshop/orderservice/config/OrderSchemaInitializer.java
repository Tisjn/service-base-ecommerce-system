package com.dtpshop.orderservice.config;

import java.sql.SQLException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class OrderSchemaInitializer implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(OrderSchemaInitializer.class);
    private static final String DUPLICATE_COLUMN_SQL_STATE = "42S21";
    private static final int MYSQL_DUPLICATE_COLUMN_ERROR_CODE = 1060;

    private final JdbcTemplate jdbcTemplate;

    public OrderSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        ensureCostPriceColumn();
    }

    private void ensureCostPriceColumn() {
        try {
            jdbcTemplate.execute("ALTER TABLE order_items ADD COLUMN cost_price DECIMAL(19, 2) NULL");
            logger.info("Added missing order_items.cost_price column");
        } catch (DataAccessException ex) {
            if (isDuplicateColumn(ex)) {
                return;
            }
            logger.warn("Unable to ensure order_items.cost_price column: {}", ex.getMessage());
        }
    }

    private boolean isDuplicateColumn(DataAccessException ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof SQLException sqlException
                    && (MYSQL_DUPLICATE_COLUMN_ERROR_CODE == sqlException.getErrorCode()
                            || DUPLICATE_COLUMN_SQL_STATE.equals(sqlException.getSQLState()))) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
