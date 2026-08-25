package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Guide;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface GuideRepository extends JpaRepository<Guide, UUID> {
    List<Guide> findAllByReservation_ReservationId(UUID reservationId);
    void deleteAllByReservation_ReservationId(UUID reservationId);
}