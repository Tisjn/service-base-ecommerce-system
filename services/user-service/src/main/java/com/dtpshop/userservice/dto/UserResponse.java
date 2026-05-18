package com.dtpshop.userservice.dto;

import com.dtpshop.userservice.model.UserProfile;
import com.dtpshop.userservice.model.UserStatus;
import java.time.Instant;

public record UserResponse(
        Long id,
        String email,
        String fullName,
        String role,
        UserStatus status,
        String avatarUrl,
        String phone,
        String address,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserResponse from(UserProfile user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getStatus(),
                user.getAvatarUrl(),
                user.getPhone(),
                user.getAddress(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
