package com.camping.duneinsolite.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AvailabilityBlockResponse {
    private UUID availabilityBlockId;
    private UUID tourTypeId;
    private String tourTypeName;
    private LocalDate date;
    private String note;
    private LocalDateTime createdAt;
}
