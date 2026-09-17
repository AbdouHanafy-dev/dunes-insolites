package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.dto.ExtraResourceRequirementDto;
import com.camping.duneinsolite.model.CancellationPolicy;
import com.camping.duneinsolite.model.ExtraDuration;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.GroupSizeType;
import com.camping.duneinsolite.model.enums.Language;
import com.camping.duneinsolite.model.enums.ExtraCategory;
import com.camping.duneinsolite.model.enums.PickupField;
import com.camping.duneinsolite.model.enums.PricingUnit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;
import java.util.Set;

@Data
public class ExtraRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String slug;

    private String description;
    private String duration;

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Unit price cannot be negative")
    private java.math.BigDecimal unitPrice;

    private Boolean isActive = true;

    /** Null = not configured, no ceiling enforced. */
    @Min(value = 0, message = "Capacity cannot be negative")
    private Integer maxUnitsPerDay;
    private ExtraCategory category = ExtraCategory.ACTIVITY;
    private String serviceType;
    private PricingUnit pricingUnit = PricingUnit.PER_UNIT;
    private Boolean requiresCustomerVehicle = false;
    private Integer displayOrder = 0;
    private Set<PickupField> pickupFields;
    private Set<PickupField> requiredPickupFields;
    @Valid
    private List<ExtraResourceRequirementDto> resourceRequirements;

    private String aboutText;
    private List<String> highlights;
    private List<String> includedItems;
    private List<String> notIncludedItems;
    private List<ProgramStep> programSteps;
    private String meetingPoint;
    private String location;
    private GroupSizeType groupSizeType;
    private Set<Language> languages;
    private CancellationPolicy cancellationPolicy;
    private ExtraDuration extraDuration;
    private String coverPhotoUrl;
    private List<Photo> photos;

    // Non-French copy, one entry per locale. Fields above stay the French
    // source of truth - see ContentLocale. Omitted locales simply fall back
    // to the French text at read time; this list doesn't need to be complete.
    private List<CatalogTranslationDto> translations;

    @NotNull(message = "TVA is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "TVA cannot be negative")
    @DecimalMax(value = "100.0", inclusive = true, message = "TVA cannot exceed 100%")
    private java.math.BigDecimal tva;
}
