package com.camping.duneinsolite.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class RedirectResponse {
    private UUID redirectId;
    private String fromPath;
    private String toPath;
    private Integer statusCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
