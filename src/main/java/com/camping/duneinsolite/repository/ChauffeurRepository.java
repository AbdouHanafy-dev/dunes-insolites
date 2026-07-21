// ChauffeurRepository.java
package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Chauffeur;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChauffeurRepository extends JpaRepository<Chauffeur, UUID> {
    List<Chauffeur> findAllByReservation_ReservationId(UUID reservationId);
    void deleteAllByReservation_ReservationId(UUID reservationId);
}