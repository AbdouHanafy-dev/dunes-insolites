package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.Currency;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class AccommodationTypeRequest {

    @NotNull(message = "The nuitée (tourTypeId) is required")
    private UUID tourTypeId;

    @NotBlank(message = "Slug is required")
    private String slug;

    @NotBlank(message = "Name is required")
    private String name;

    private String description;
    private String imageUrl;

    @Min(value = 1, message = "Capacity must be at least 1")
    private int capacity;

    /**
     * How many physical units of this tier exist (Phase 2 inventory ceiling).
     * Null = not configured → availability is UNKNOWN, no ceiling enforced.
     * BUSINESS DECISION (F-2b): the real per-tier unit counts.
     */
    @Min(value = 0, message = "Unit count cannot be negative")
    private Integer maxUnits;

    /** TTC, per unit per night. Null = not configured (tier stays unbookable). */
    @DecimalMin(value = "0.0", message = "Price cannot be negative")
    private BigDecimal unitPriceTtc;

    @DecimalMin(value = "0.0", message = "TVA rate cannot be negative")
    private BigDecimal tvaRate;

    private Currency currency;

    private Integer displayOrder;

    private Boolean active;

    private List<String> features;
}
