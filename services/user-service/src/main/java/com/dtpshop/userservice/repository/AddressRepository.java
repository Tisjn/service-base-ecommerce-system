package com.dtpshop.userservice.repository;

import com.dtpshop.userservice.model.Address;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AddressRepository extends JpaRepository<Address, Long> {

    Optional<Address> findFirstByUserIdOrderByIdAsc(Long userId);
}
