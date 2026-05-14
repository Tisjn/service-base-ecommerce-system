package com.dtpshop.productservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class InventoryRequest {

    @NotEmpty
    @Valid
    private List<CartItemRequest> items;

    private String correlationId;
}
