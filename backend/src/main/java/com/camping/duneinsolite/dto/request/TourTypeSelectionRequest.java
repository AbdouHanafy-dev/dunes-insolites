package com.camping.duneinsolite.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class TourTypeSelectionRequest {
    @NotNull(message = "Tour type ID is required")
    private UUID tourTypeId;

    @Min(value = 0, message = "Number of adults cannot be negative")
    private Integer numberOfAdults;

    @Min(value = 0, message = "Number of children cannot be negative")
    private Integer numberOfChildren;

    @NotNull(message = "Activity date is required for each tour type")
    private LocalDate activityDate;

    private List<RepartitionRequest> repartitions;

    // ── Accommodation (Phase 1) ────────────────────────────────────────
    // When set, this stay line is priced per accommodation unit per night
    // (server-resolved, see AccommodationPricingService) instead of per person.
    // The client sends the tier + a unit count only — never a price.
    private UUID accommodationTypeId;

    @Min(value = 1, message = "Accommodation units must be at least 1")
    private Integer accommodationUnits;
}
