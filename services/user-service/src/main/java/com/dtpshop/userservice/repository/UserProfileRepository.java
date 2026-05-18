package com.dtpshop.userservice.repository;

import com.dtpshop.userservice.model.UserProfile;
import com.dtpshop.userservice.model.UserStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

    Optional<UserProfile> findByEmailIgnoreCase(String email);

    List<UserProfile> findByDeletedFalseOrderByCreatedAtDesc();

    List<UserProfile> findByStatusAndDeletedFalseOrderByCreatedAtDesc(UserStatus status);
}
