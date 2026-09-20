package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.GuideProfile;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GuideProfileRepository extends JpaRepository<GuideProfile, UUID> {
    List<GuideProfile> findAllByOrderByActiveDescFirstNameAscLastNameAsc();
    boolean existsByEmailIgnoreCase(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from GuideProfile g where g.guideProfileId = :id and g.active = true")
    Optional<GuideProfile> lockActiveById(UUID id);
}
