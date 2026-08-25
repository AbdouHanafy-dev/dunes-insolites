package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.UserProductRemise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserProductRemiseRepository extends JpaRepository<UserProductRemise, UUID> {

    Optional<UserProductRemise> findByUser_UserIdAndProductId(UUID userId, UUID productId);

    List<UserProductRemise> findAllByUser_UserId(UUID userId);

    void deleteAllByProductId(UUID productId);

    void deleteAllByUser_UserId(UUID userId);
}
