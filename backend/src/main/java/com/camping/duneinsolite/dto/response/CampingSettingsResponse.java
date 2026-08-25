package com.camping.duneinsolite.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CampingSettingsResponse {
    private Integer maxCapacity;
    private boolean configured;
    private LocalDateTime updatedAt;
}
