package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.NotificationType;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class NotificationResponse {
    private UUID notificationId;
    private UUID reservationId;
    private NotificationType type;
    private String title;
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;
    private UUID userId;
    private String userName;
}