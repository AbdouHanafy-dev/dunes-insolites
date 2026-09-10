package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.model.CancellationPolicy;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.GroupSizeType;
import com.camping.duneinsolite.model.enums.Language;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;
import java.util.Set;

@Data
public class TourTypeRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String slug;

    private String description;
    private String duration;

    private String aboutText;
    private List<String> highlights;
    private List<String> includedItems;
    private List<String> notIncludedItems;
    private List<ProgramStep> programSteps;
    private String meetingPoint;
    private String location;
    private Boolean isActive;
    private GroupSizeType groupSizeType;
    private Set<Language> languages;
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