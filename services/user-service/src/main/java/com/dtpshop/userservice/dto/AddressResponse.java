package com.dtpshop.userservice.dto;

import com.dtpshop.userservice.model.Address;

public record AddressResponse(
        Long id,
        Long userId,
        String street,
        String city,
        String state,
        String postalCode,
        String country
) {
    public static AddressResponse from(Address address) {
        if (address == null) {
            return null;
        }

        return new AddressResponse(
                address.getId(),
                address.getUser().getId(),
                address.getStreet(),
                address.getCity(),
                address.getState(),
                address.getPostalCode(),
                address.getCountry()
        );
    }
}
