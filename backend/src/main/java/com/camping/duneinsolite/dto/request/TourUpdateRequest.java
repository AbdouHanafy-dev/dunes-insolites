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
public class TourUpdateRequest {

    @NotBlank(message = "Tour name is required")
    private String name;

    private String description;

    private String duration;

    private String aboutText;
    private List<String> highlights;
    private List<String> includedItems;
    private List<String> notIncludedItems;
    private List<ProgramStep> programSteps;
    private String meetingPoint;
    private String location;
    private GroupSizeType groupSizeType;
    private Set<UUID> languageIds;
    private CancellationPolicy cancellationPolicy;
    private String coverPhotoUrl;
    private List<Photo> photos;
    private List<CatalogTranslationDto> translations;

    @NotNull(message = "Passenger adult price is required")
    private java.math.BigDecimal passengerAdultPrice;

    @NotNull(message = "Passenger child price is required")
    private java.math.BigDecimal passengerChildPrice;

    @NotNull(message = "Partner adult price is required")
    private java.math.BigDecimal partnerAdultPrice;

    @NotNull(message = "Partner child price is required")
    private java.math.BigDecimal partnerChildPrice;

    private Boolean isActive;

    @NotNull(message = "TVA is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "TVA cannot be negative")
    @DecimalMax(value = "100.0", inclusive = true, message = "TVA cannot exceed 100%")
    private java.math.BigDecimal tva;
}