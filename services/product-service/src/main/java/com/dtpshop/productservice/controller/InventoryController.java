package com.dtpshop.productservice.controller;

import com.dtpshop.productservice.dto.InventoryRequest;
import com.dtpshop.productservice.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final ProductService productService;

    public InventoryController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping("/reserve")
    public ResponseEntity<Void> reserveInventory(@Valid @RequestBody InventoryRequest request) {
        productService.reserveInventory(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refund")
    public ResponseEntity<Void> refundInventory(@Valid @RequestBody InventoryRequest request) {
        productService.refundInventory(request);
        return ResponseEntity.noContent().build();
    }
}
