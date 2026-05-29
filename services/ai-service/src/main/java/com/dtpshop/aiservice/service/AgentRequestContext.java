package com.dtpshop.aiservice.service;

public record AgentRequestContext(
        long userId,
        String userRole,
        String userEmail,
        String authorization) {

    public boolean isAdmin() {
        return userRole != null && userRole.toUpperCase().contains("ADMIN");
    }
}
