package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MaintenanceWindowRequest {

    @NotBlank(message = "Path is required")
    @Pattern(regexp = "^/.*", message = "Path must start with /")
    private String path;

    private Boolean isActive;

    private String message;

    private LocalDateTime endsAt;
}
