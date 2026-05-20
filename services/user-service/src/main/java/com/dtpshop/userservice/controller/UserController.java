package com.dtpshop.userservice.controller;

import com.dtpshop.userservice.dto.AddressRequest;
import com.dtpshop.userservice.dto.AddressResponse;
import com.dtpshop.userservice.dto.UserResponse;
import com.dtpshop.userservice.dto.UserStatusUpdateRequest;
import com.dtpshop.userservice.dto.UserUpdateRequest;
import com.dtpshop.userservice.model.UserStatus;
import com.dtpshop.userservice.security.GatewayUser;
import com.dtpshop.userservice.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/users", "/api/users"})
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal GatewayUser gatewayUser) {
        return ResponseEntity.ok(userService.getOrCreateMe(gatewayUser));
    }

    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateMe(
            @AuthenticationPrincipal GatewayUser gatewayUser,
            @Valid @RequestBody UserUpdateRequest request
    ) {
        return ResponseEntity.ok(userService.updateMe(gatewayUser, request));
    }

    @GetMapping("/me/addresses")
    public ResponseEntity<List<AddressResponse>> getMyAddresses(@AuthenticationPrincipal GatewayUser gatewayUser) {
        return ResponseEntity.ok(userService.getMyAddresses(gatewayUser));
    }

    @PostMapping("/me/addresses")
    public ResponseEntity<AddressResponse> createMyAddress(
            @AuthenticationPrincipal GatewayUser gatewayUser,
            @Valid @RequestBody AddressRequest request
    ) {
        return ResponseEntity.status(201).body(userService.createMyAddress(gatewayUser, request));
    }

    @PatchMapping("/me/addresses/{addressId}")
    public ResponseEntity<AddressResponse> updateMyAddress(
            @AuthenticationPrincipal GatewayUser gatewayUser,
            @PathVariable Long addressId,
            @Valid @RequestBody AddressRequest request
    ) {
        return ResponseEntity.ok(userService.updateMyAddress(gatewayUser, addressId, request));
    }

    @DeleteMapping("/me/addresses/{addressId}")
    public ResponseEntity<Void> deleteMyAddress(
            @AuthenticationPrincipal GatewayUser gatewayUser,
            @PathVariable Long addressId
    ) {
        userService.deleteMyAddress(gatewayUser, addressId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> listUsers(
            @RequestParam(value = "status", required = false) UserStatus status
    ) {
        return ResponseEntity.ok(userService.findUsers(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUser(id));
    }

    @GetMapping("/{id}/addresses")
    public ResponseEntity<List<AddressResponse>> getUserAddresses(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserAddresses(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request
    ) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UserStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(userService.updateStatus(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<UserResponse> deleteUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.softDelete(id));
    }
}
