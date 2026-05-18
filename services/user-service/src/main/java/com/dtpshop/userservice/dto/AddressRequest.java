package com.dtpshop.userservice.dto;

import jakarta.validation.constraints.Size;

public record AddressRequest(
        @Size(max = 255, message = "Duong toi da 255 ky tu")
        String street,

        @Size(max = 100, message = "Thanh pho toi da 100 ky tu")
        String city,

        @Size(max = 100, message = "Tinh/bang toi da 100 ky tu")
        String state,

        @Size(max = 20, message = "Ma buu chinh toi da 20 ky tu")
        String postalCode,

        @Size(max = 100, message = "Quoc gia toi da 100 ky tu")
        String country
) {
}
