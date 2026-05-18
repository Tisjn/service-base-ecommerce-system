package com.dtpshop.userservice.dto;

import com.dtpshop.userservice.model.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UserStatusUpdateRequest(
        @NotNull(message = "Trang thai khong duoc de trong")
        UserStatus status
) {
}
