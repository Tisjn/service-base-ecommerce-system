package com.dtpshop.orderservice.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@NoArgsConstructor
public class CartItemDto {
    private Long productId;
    private String productName;
    private Integer quantity;
    private BigDecimal price;
    private BigDecimal costPrice;

    public CartItemDto(Long productId, String productName, Integer quantity, BigDecimal price) {
        this(productId, productName, quantity, price, null);
    }

    public CartItemDto(Long productId, String productName, Integer quantity, BigDecimal price,
            BigDecimal costPrice) {
        this.productId = productId;
        this.productName = productName;
        this.quantity = quantity;
        this.price = price;
        this.costPrice = costPrice;
    }

    public BigDecimal getSubtotal() {
        return price == null ? BigDecimal.ZERO : price.multiply(BigDecimal.valueOf(quantity));
    }

    public BigDecimal getGrossProfit() {
        BigDecimal salePrice = price == null ? BigDecimal.ZERO : price;
        BigDecimal cost = costPrice == null ? BigDecimal.ZERO : costPrice;
        Integer itemQuantity = quantity == null ? 0 : quantity;
        return salePrice.subtract(cost).multiply(BigDecimal.valueOf(itemQuantity));
    }

    @JsonCreator
    public static CartItemDto create(@JsonProperty("productId") Long productId,
            @JsonProperty("productName") String productName,
            @JsonProperty("quantity") Integer quantity,
            @JsonProperty("price") BigDecimal price,
            @JsonProperty("costPrice") BigDecimal costPrice) {
        return new CartItemDto(productId, productName, quantity, price, costPrice);
    }

    public static CartItemDto fromObject(Object object) {
        if (object instanceof Map<?, ?> map) {
            Long productId = map.get("productId") instanceof Number num ? num.longValue() : null;
            String productName = map.get("productName") == null ? null : map.get("productName").toString();
            Integer quantity = map.get("quantity") instanceof Number num2 ? num2.intValue() : null;
            BigDecimal price = map.get("price") instanceof Number num3 ? BigDecimal.valueOf(num3.doubleValue()) : null;
            BigDecimal costPrice = map.get("costPrice") instanceof Number num4 ? BigDecimal.valueOf(num4.doubleValue())
                    : null;
            return new CartItemDto(productId, productName, quantity, price, costPrice);
        }
        throw new IllegalArgumentException("Unable to convert cart item");
    }
}
