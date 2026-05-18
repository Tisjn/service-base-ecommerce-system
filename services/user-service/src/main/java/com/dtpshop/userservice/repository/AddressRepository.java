package com.dtpshop.userservice.repository;

import com.dtpshop.userservice.model.Address;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface AddressRepository extends JpaRepository<Address, Long> {

    List<Address> findByUserIdOrderByDefaultAddressDescCreatedAtDescIdDesc(Long userId);

    Optional<Address> findByIdAndUserId(Long id, Long userId);

    Optional<Address> findFirstByUserIdOrderByDefaultAddressDescCreatedAtAscIdAsc(Long userId);

    long countByUserId(Long userId);

    @Modifying
    @Query("update Address a set a.defaultAddress = false where a.user.id = :userId")
    void clearDefaultForUser(Long userId);
}
