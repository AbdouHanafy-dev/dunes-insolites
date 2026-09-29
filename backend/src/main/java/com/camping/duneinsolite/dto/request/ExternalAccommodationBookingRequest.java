package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.ExternalBookingSource;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ExternalAccommodationBookingRequest {
    @NotNull
    private UUID accommodationTypeId;

    @NotNull
    private LocalDate checkIn;

    @NotNull
    private LocalDate checkOut;

    @Min(1)
    private int units;

    @NotNull
    private ExternalBookingSource source;

    @Size(max = 120)
    private String externalReference;

    @Size(max = 500)
    private String note;

    @AssertTrue(message = "Check-out must be after check-in")
    public boolean isDateRangeValid() {
        return checkIn == null || checkOut == null || checkOut.isAfter(checkIn);
    }
}
