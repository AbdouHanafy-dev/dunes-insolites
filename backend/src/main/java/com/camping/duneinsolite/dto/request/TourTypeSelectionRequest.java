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

    @Min(value = 0, message = "Number of infants cannot be negative")
    private Integer numberOfInfants;

    @NotNull(message = "Activity date is required for each tour type")
    private LocalDate activityDate;

    private List<RepartitionRequest> repartitions;

    // ── Accommodation (Phase 1; multi-tier since the accommodation-selection
    // feature) ────────────────────────────────────────────────────────────
    // When set, this stay line is priced per accommodation unit per night
    // (server-resolved, see AccommodationPricingService) instead of per person.
    // The client sends the tier(s) + a unit count only — never a price.
    // `accommodationTypeId`/`accommodationUnits` are the older single-tier
    // shape, still used by the admin manual-reservation form — kept working
    // via `resolvedAccommodationSelections()` below. The public multi-tier
    // booking flow sends `accommodationSelections` instead.
    private UUID accommodationTypeId;

    @Min(value = 1, message = "Accommodation units must be at least 1")
    private Integer accommodationUnits;

    private List<AccommodationSelectionRequest> accommodationSelections;

    /** Normalizes either shape into one list — empty when no tier was picked. */
    public List<AccommodationSelectionRequest> resolvedAccommodationSelections() {
        if (accommodationSelections != null && !accommodationSelections.isEmpty()) {
            return accommodationSelections;
        }
        if (accommodationTypeId != null) {
            AccommodationSelectionRequest single = new AccommodationSelectionRequest();
            single.setAccommodationTypeId(accommodationTypeId);
            single.setAccommodationUnits(accommodationUnits != null ? accommodationUnits : 1);
            return List.of(single);
        }
        return List.of();
    }
}
