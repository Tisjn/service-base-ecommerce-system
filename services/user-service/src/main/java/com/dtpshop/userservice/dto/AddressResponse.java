package com.dtpshop.userservice.dto;

import com.dtpshop.userservice.model.Address;

import java.time.Instant;

public record AddressResponse(
        Long id,
        Long customerId,
        String recipientName,
        String phone,
        String label,
        String street,
        String district,
        String city,
        boolean defaultAddress,
        Instant createdAt
) {
    public static AddressResponse from(Address address) {
        if (address == null) {
            return null;
        }

        return new AddressResponse(
                address.getId(),
                address.getUser().getId(),
                address.getRecipientName(),
                address.getPhone(),
                address.getLabel(),
                address.getStreet(),
                address.getDistrict(),
                address.getCity(),
                address.isDefaultAddress(),
                address.getCreatedAt()
        );
    }
}
