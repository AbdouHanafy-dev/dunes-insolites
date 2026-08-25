package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.NotificationType;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.UUID;

@Data
public class NotificationRequest {

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "Type is required")
    private NotificationType type;

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;


}