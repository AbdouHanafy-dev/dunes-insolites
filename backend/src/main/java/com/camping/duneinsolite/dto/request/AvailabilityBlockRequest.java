package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class AvailabilityBlockRequest {

    @NotNull(message = "Tour type is required")
    private UUID tourTypeId;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private String note;
}
