package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ReservationExtra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReservationExtraRepository extends JpaRepository<ReservationExtra, UUID> {
    List<ReservationExtra> findByReservationReservationId(UUID reservationId);
    List<ReservationExtra> findByIsActiveTrue();
}