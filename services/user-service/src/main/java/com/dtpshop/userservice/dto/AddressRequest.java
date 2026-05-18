package com.dtpshop.userservice.dto;

import jakarta.validation.constraints.Size;

public record AddressRequest(
        @Size(max = 160, message = "Ten nguoi nhan toi da 160 ky tu")
        String recipientName,

        @Size(max = 40, message = "So dien thoai toi da 40 ky tu")
        String phone,

        @Size(max = 60, message = "Nhan dia chi toi da 60 ky tu")
        String label,

        @Size(max = 255, message = "Duong toi da 255 ky tu")
        String street,

        @Size(max = 100, message = "Quan/huyen toi da 100 ky tu")
        String district,

        @Size(max = 100, message = "Thanh pho toi da 100 ky tu")
        String city,

        Boolean defaultAddress
) {
}
