// ChauffeurRepository.java
package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Chauffeur;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
import java.time.LocalDate;
import com.camping.duneinsolite.model.enums.ReservationStatus;

public interface ChauffeurRepository extends JpaRepository<Chauffeur, UUID> {
    List<Chauffeur> findAllByReservation_ReservationId(UUID reservationId);
    void deleteAllByReservation_ReservationId(UUID reservationId);
    List<Chauffeur> findAllByDriverUser_UserIdOrderByReservation_ServiceDateDesc(UUID driverUserId);
    boolean existsByDriverProfile_DriverProfileIdAndReservation_ServiceDateAndReservation_StatusIn(
            UUID driverProfileId, LocalDate serviceDate, List<ReservationStatus> statuses);
}
