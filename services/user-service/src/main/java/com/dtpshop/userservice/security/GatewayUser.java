package com.dtpshop.userservice.security;

public record GatewayUser(Long id, String email, String role) {

    public boolean isAdmin() {
        return role != null && role.toUpperCase().contains("ADMIN");
    }
}
