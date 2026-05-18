package com.dtpshop.userservice.dto;

import jakarta.validation.constraints.Size;

public record UserUpdateRequest(
        @Size(max = 160, message = "Ho ten toi da 160 ky tu")
        String fullName,

        @Size(max = 1024, message = "Avatar URL toi da 1024 ky tu")
        String avatarUrl,

        @Size(max = 40, message = "So dien thoai toi da 40 ky tu")
        String phone,

        @Size(max = 512, message = "Dia chi toi da 512 ky tu")
        String address
) {
}
