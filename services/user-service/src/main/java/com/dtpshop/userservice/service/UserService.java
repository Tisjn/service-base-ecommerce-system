package com.dtpshop.userservice.service;

import com.dtpshop.userservice.client.OrderServiceClient;
import com.dtpshop.userservice.dto.AddressRequest;
import com.dtpshop.userservice.dto.AddressResponse;
import com.dtpshop.userservice.dto.UserResponse;
import com.dtpshop.userservice.dto.UserStatusUpdateRequest;
import com.dtpshop.userservice.dto.UserUpdateRequest;
import com.dtpshop.userservice.exception.ApiException;
import com.dtpshop.userservice.model.Address;
import com.dtpshop.userservice.model.UserProfile;
import com.dtpshop.userservice.model.UserStatus;
import com.dtpshop.userservice.repository.AddressRepository;
import com.dtpshop.userservice.repository.UserProfileRepository;
import com.dtpshop.userservice.security.GatewayUser;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserProfileRepository userRepository;
    private final AddressRepository addressRepository;
    private final OrderServiceClient orderServiceClient;

    public UserService(
            UserProfileRepository userRepository,
            AddressRepository addressRepository,
            OrderServiceClient orderServiceClient
    ) {
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
        this.orderServiceClient = orderServiceClient;
    }

    @Transactional
    public UserResponse getOrCreateMe(GatewayUser gatewayUser) {
        UserProfile user = userRepository.findById(gatewayUser.id())
                .orElseGet(() -> createFromGateway(gatewayUser));
        syncGatewayFields(user, gatewayUser);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateMe(GatewayUser gatewayUser, UserUpdateRequest request) {
        UserProfile user = userRepository.findById(gatewayUser.id())
                .orElseGet(() -> createFromGateway(gatewayUser));
        syncGatewayFields(user, gatewayUser);
        applyProfileUpdate(user, request);
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public AddressResponse getMyAddress(GatewayUser gatewayUser) {
        return addressRepository.findFirstByUserIdOrderByIdAsc(gatewayUser.id())
                .map(AddressResponse::from)
                .orElse(null);
    }

    @Transactional
    public AddressResponse upsertMyAddress(GatewayUser gatewayUser, AddressRequest request) {
        UserProfile user = userRepository.findById(gatewayUser.id())
                .orElseGet(() -> createFromGateway(gatewayUser));
        Address address = addressRepository.findFirstByUserIdOrderByIdAsc(gatewayUser.id())
                .orElseGet(() -> {
                    Address next = new Address();
                    next.setUser(user);
                    return next;
                });

        address.setStreet(blankToNull(request.street()));
        address.setCity(blankToNull(request.city()));
        address.setState(blankToNull(request.state()));
        address.setPostalCode(blankToNull(request.postalCode()));
        address.setCountry(blankToNull(request.country()));

        return AddressResponse.from(addressRepository.save(address));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findUsers(UserStatus status) {
        List<UserProfile> users = status == null
                ? userRepository.findByDeletedFalseOrderByCreatedAtDesc()
                : userRepository.findByStatusAndDeletedFalseOrderByCreatedAtDesc(status);
        return users.stream().map(UserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(Long id) {
        return UserResponse.from(findActiveUser(id));
    }

    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        UserProfile user = findActiveUser(id);
        applyProfileUpdate(user, request);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateStatus(Long id, UserStatusUpdateRequest request) {
        UserProfile user = findActiveUser(id);
        if (request.status() == UserStatus.DELETED) {
            return softDelete(id);
        }
        user.setStatus(request.status());
        user.setDeleted(false);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse softDelete(Long id) {
        UserProfile user = findActiveUser(id);
        if (orderServiceClient.hasOrders(id)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Khong the xoa tai khoan da tung dat hang. Hay khoa tai khoan thay vi xoa."
            );
        }
        user.setStatus(UserStatus.DELETED);
        user.setDeleted(true);
        return UserResponse.from(user);
    }

    private UserProfile findActiveUser(Long id) {
        UserProfile user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Nguoi dung khong ton tai"));
        if (user.isDeleted()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Nguoi dung khong ton tai");
        }
        return user;
    }

    private UserProfile createFromGateway(GatewayUser gatewayUser) {
        if (gatewayUser.email() == null || gatewayUser.email().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Gateway chua gui X-User-Email");
        }

        UserProfile user = new UserProfile();
        user.setId(gatewayUser.id());
        user.setEmail(gatewayUser.email().trim().toLowerCase());
        user.setFullName(gatewayUser.email().trim());
        user.setRole(gatewayUser.role());
        user.setStatus(UserStatus.ACTIVE);
        return userRepository.save(user);
    }

    private void syncGatewayFields(UserProfile user, GatewayUser gatewayUser) {
        if (gatewayUser.email() != null && !gatewayUser.email().isBlank()) {
            user.setEmail(gatewayUser.email().trim().toLowerCase());
        }
        if (gatewayUser.role() != null && !gatewayUser.role().isBlank()) {
            user.setRole(gatewayUser.role().trim().toUpperCase());
        }
    }

    private void applyProfileUpdate(UserProfile user, UserUpdateRequest request) {
        if (request.fullName() != null) {
            String fullName = request.fullName().trim();
            if (fullName.isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Ho ten khong duoc de trong");
            }
            user.setFullName(fullName);
        }
        if (request.avatarUrl() != null) {
            user.setAvatarUrl(blankToNull(request.avatarUrl()));
        }
        if (request.phone() != null) {
            user.setPhone(blankToNull(request.phone()));
        }
        if (request.address() != null) {
            user.setAddress(blankToNull(request.address()));
        }
    }

    private String blankToNull(String value) {
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
