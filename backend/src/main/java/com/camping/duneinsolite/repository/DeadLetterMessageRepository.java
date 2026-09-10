package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.DeadLetterMessage;
import com.camping.duneinsolite.model.enums.DeadLetterStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DeadLetterMessageRepository extends JpaRepository<DeadLetterMessage, UUID> {

    Page<DeadLetterMessage> findByStatusOrderByRecordedAtDesc(DeadLetterStatus status, Pageable pageable);

    Page<DeadLetterMessage> findByOrderByRecordedAtDesc(Pageable pageable);

    boolean existsByQueueNameAndPayloadAndStatus(String queueName, String payload, DeadLetterStatus status);
}
