    package com.camping.duneinsolite.repository;

    import com.camping.duneinsolite.model.Notification;
    import org.springframework.data.jpa.repository.JpaRepository;

    import java.util.List;
    import java.util.UUID;

    public interface NotificationRepository extends JpaRepository<Notification, UUID> {

        // get all notifications for a user, newest first
        List<Notification> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);

        // get only unread notifications for a user
        List<Notification> findByUser_UserIdAndIsReadFalse(UUID userId);

        // count unread notifications — used for bell badge number
        long countByUser_UserIdAndIsReadFalse(UUID userId);

        // Idempotency (V6): has this exact message already been delivered to
        // this user? Fast path before insert; the partial unique index is the
        // real guarantee under a concurrent duplicate.
        boolean existsByUser_UserIdAndDedupeKey(UUID userId, String dedupeKey);

        // Ephemeral, no audit/financial significance - safe to cascade-clean
        // when a user is deleted (see KeycloakUserSyncService.deleteUser's
        // own comment).
        void deleteAllByUser_UserId(UUID userId);
    }