package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.dto.ExtraResourceRequirementDto;
import com.camping.duneinsolite.model.CancellationPolicy;
import com.camping.duneinsolite.model.ExtraDuration;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.GroupSizeType;
import com.camping.duneinsolite.model.enums.ExtraCategory;
import com.camping.duneinsolite.model.enums.PickupField;
import com.camping.duneinsolite.model.enums.PricingUnit;
import lombok.Data;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
public class ExtraResponse {
    private UUID extraId;
    private String name;
    private String slug;
    private String description;
    private String duration;
    private java.math.BigDecimal unitPrice;
    private Integer baseDurationMinutes;
    private Integer durationStepMinutes;
    private Integer maxDurationMinutes;
    private Boolean isActive;
    private java.math.BigDecimal tva;
    private Integer maxUnitsPerDay;
    private Integer minPartySize;
    private ExtraCategory category;
    private String serviceType;
    private PricingUnit pricingUnit;
    private boolean requiresCustomerVehicle;
    private int displayOrder;
    private Set<PickupField> pickupFields;
    private Set<PickupField> requiredPickupFields;
    private List<ExtraResourceRequirementDto> resourceRequirements;

    private String aboutText;
    private List<String> highlights;
    private List<String> includedItems;
    private List<String> notIncludedItems;
    private List<ProgramStep> programSteps;
    private String meetingPoint;
    private String location;
    private GroupSizeType groupSizeType;
    private Set<SpokenLanguageResponse> languages;
    private CancellationPolicy cancellationPolicy;
    private ExtraDuration extraDuration;
    private String coverPhotoUrl;
    private List<Photo> photos;
    private Double averageRating;
    private Integer reviewCount;
    private List<CatalogTranslationDto> translations;
}
