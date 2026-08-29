package com.camping.duneinsolite.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class MaintenanceWindowResponse {
    private UUID maintenanceId;
    private String path;
    private Boolean isActive;
    private String message;
    private LocalDateTime endsAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
