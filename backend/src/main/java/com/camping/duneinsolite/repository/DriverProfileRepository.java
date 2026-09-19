package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.DriverProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DriverProfileRepository extends JpaRepository<DriverProfile, UUID> {
    List<DriverProfile> findAllByOrderByActiveDescFirstNameAscLastNameAsc();
    Optional<DriverProfile> findByDriverProfileIdAndActiveTrue(UUID id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from DriverProfile d where d.driverProfileId = :id and d.active = true")
    Optional<DriverProfile> lockActiveById(UUID id);
    boolean existsByUser_EmailIgnoreCase(String email);
}
