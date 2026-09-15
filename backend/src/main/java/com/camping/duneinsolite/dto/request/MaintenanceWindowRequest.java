package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MaintenanceWindowRequest {

    @NotBlank(message = "Path is required")
    @Size(max = 512, message = "Path must not exceed 512 characters")
    @Pattern(regexp = "^/.*", message = "Path must start with /")
    private String path;

    private Boolean isActive;

    @Size(max = 2000, message = "Message must not exceed 2000 characters")
    private String message;

    private LocalDateTime endsAt;
}
