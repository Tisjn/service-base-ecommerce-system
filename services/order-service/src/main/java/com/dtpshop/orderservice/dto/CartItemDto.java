package com.dtpshop.orderservice.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@NoArgsConstructor
@AllArgsConstructor
public class CartItemDto {
    private Long productId;
    private String productName;
    private Integer quantity;
    private BigDecimal price;

    public BigDecimal getSubtotal() {
        return price == null ? BigDecimal.ZERO : price.multiply(BigDecimal.valueOf(quantity));
    }

    @JsonCreator
    public static CartItemDto create(@JsonProperty("productId") Long productId,
            @JsonProperty("productName") String productName,
            @JsonProperty("quantity") Integer quantity,
            @JsonProperty("price") BigDecimal price) {
        return new CartItemDto(productId, productName, quantity, price);
    }

    public static CartItemDto fromObject(Object object) {
        if (object instanceof Map<?, ?> map) {
            Long productId = map.get("productId") instanceof Number num ? num.longValue() : null;
            String productName = map.get("productName") == null ? null : map.get("productName").toString();
            Integer quantity = map.get("quantity") instanceof Number num2 ? num2.intValue() : null;
            BigDecimal price = map.get("price") instanceof Number num3 ? BigDecimal.valueOf(num3.doubleValue()) : null;
            return new CartItemDto(productId, productName, quantity, price);
        }
        throw new IllegalArgumentException("Unable to convert cart item");
    }
}
