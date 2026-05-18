package com.dtpshop.userservice.model;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum UserStatus {
    ACTIVE,
    LOCKED,
    DELETED;

    @JsonCreator
    public static UserStatus from(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim().toUpperCase();
        if ("BLOCKED".equals(normalized) || "INACTIVE".equals(normalized)) {
            return LOCKED;
        }
        return UserStatus.valueOf(normalized);
    }
}
