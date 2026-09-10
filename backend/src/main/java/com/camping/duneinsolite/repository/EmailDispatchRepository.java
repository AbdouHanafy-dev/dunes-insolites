package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.EmailDispatch;
import com.camping.duneinsolite.model.enums.EmailType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmailDispatchRepository extends JpaRepository<EmailDispatch, UUID> {

    Optional<EmailDispatch> findByReservationIdAndEmailType(UUID reservationId, EmailType emailType);
}
