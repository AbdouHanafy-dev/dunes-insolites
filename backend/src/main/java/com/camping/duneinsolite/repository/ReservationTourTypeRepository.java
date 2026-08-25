package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ReservationTourType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReservationTourTypeRepository extends JpaRepository<ReservationTourType, UUID> {
    List<ReservationTourType> findByReservationReservationId(UUID reservationId);
}