package com.dtpshop.productservice.controller;

import com.dtpshop.productservice.dto.InventoryRequest;
import com.dtpshop.productservice.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping("/reserve")
    public ResponseEntity<Void> reserveInventory(@Valid @RequestBody InventoryRequest request) {
        inventoryService.reserveInventory(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refund")
    public ResponseEntity<Void> refundInventory(@Valid @RequestBody InventoryRequest request) {
        inventoryService.refundInventory(request);
        return ResponseEntity.noContent().build();
    }
}
