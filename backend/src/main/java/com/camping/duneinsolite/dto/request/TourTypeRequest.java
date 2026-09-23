package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.model.CancellationPolicy;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.GroupSizeType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
public class TourTypeRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String slug;

    private String description;
    private String duration;

    // How many nights a guest can book in one reservation. 1 (default) =
    // fixed single-night stay, guest only picks an arrival date. >1 = guest
    // picks an arrival+departure range, capped at this many nights. Only
    // meaningful for a nuitée (TourType used as a Stay); ignored elsewhere.
    @Min(value = 1, message = "Maximum nights must be at least 1")
    private Integer maxNights;

    private String aboutText;
    private List<String> highlights;
    private List<String> includedItems;
    private List<String> notIncludedItems;
    private List<ProgramStep> programSteps;
    private String meetingPoint;
    private String location;
    private Boolean isActive;
    private Boolean guideRequired;
    private Boolean hasAccommodationTypes;
    private Boolean circuitCamp;
    private GroupSizeType groupSizeType;
    private Set<UUID> languageIds;
    private CancellationPolicy cancellationPolicy;
    private String coverPhotoUrl;
    private List<Photo> photos;

    // Non-French copy, one entry per locale. Fields above stay the French
    // source of truth - see ContentLocale. Omitted locales simply fall back
    // to the French text at read time; this list doesn't need to be complete.
    private List<CatalogTranslationDto> translations;

    @NotNull(message = "Passenger adult price is required")
    @Positive(message = "Price must be positive")
    private java.math.BigDecimal passengerAdultPrice;

    @NotNull(message = "Passenger child price is required")
    @Positive(message = "Price must be positive")
    private java.math.BigDecimal passengerChildPrice;

    @NotNull(message = "Partner adult price is required")
    @Positive(message = "Price must be positive")
    private java.math.BigDecimal partnerAdultPrice;

    @NotNull(message = "Partner child price is required")
    @Positive(message = "Price must be positive")
    private java.math.BigDecimal partnerChildPrice;

    @NotNull(message = "TVA is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "TVA cannot be negative")
    @DecimalMax(value = "100.0", inclusive = true, message = "TVA cannot exceed 100%")
    private java.math.BigDecimal tva;
}