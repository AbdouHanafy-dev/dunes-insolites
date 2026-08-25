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
    }