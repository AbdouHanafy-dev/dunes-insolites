package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.model.CancellationPolicy;
import com.camping.duneinsolite.model.Meal;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.GroupSizeType;
import com.camping.duneinsolite.model.enums.GuideType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
public class TourRequest {

    @NotBlank(message = "Tour name is required")
    private String name;

    private String slug;

    private String description;

    @jakarta.validation.constraints.Min(value = 1, message = "Duration must be at least 1 hour")
    @jakarta.validation.constraints.Max(value = 744, message = "Duration cannot exceed 744 hours (one month)")
    private Integer durationHours;

    /** Cities the guest may depart from / be dropped back to; ticked in the backoffice. */
    private java.util.Set<com.camping.duneinsolite.model.enums.DepartureCity> departureCities;
    private java.util.Set<com.camping.duneinsolite.model.enums.DepartureCity> returnCities;

    private String aboutText;
    private List<String> highlights;
    private List<String> includedItems;
    private List<String> notIncludedItems;
    private List<String> keywords;
    private List<ProgramStep> programSteps;
    private GuideType guideType;
    private Boolean overnightsAtCamp;
    private Boolean foodIncluded;
    private List<Meal> meals;
    private Boolean drinksIncluded;
    private List<String> dietaryRestrictions;
    private Boolean transportIncluded;
    private List<String> transportModes;
    private List<String> notSuitableFor;
    private List<String> notAllowed;
    private Boolean animalsAccepted;
    private String petPolicyNote;
    private List<String> mustBring;
    private String goodToKnow;
    private String emergencyPhone;
    private String ticketInfo;
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

    // Optional - a real public sale price for the adult rate. Validated
    // against passengerAdultPrice in the service layer (needs both values
    // together, which @Valid on a single field can't express).
    @DecimalMin(value = "0.0", inclusive = false, message = "Sale price must be positive")
    private java.math.BigDecimal salePriceAdult;

    @NotNull(message = "Passenger child price is required")
    private java.math.BigDecimal passengerChildPrice;

    // Infants (0-3): free until the back office sets a price.
    @NotNull(message = "Passenger infant price is required")
    @PositiveOrZero(message = "Price cannot be negative")
    private java.math.BigDecimal passengerInfantPrice = java.math.BigDecimal.ZERO;

    @NotNull(message = "Partner adult price is required")
    private java.math.BigDecimal partnerAdultPrice;

    @NotNull(message = "Partner child price is required")
    private java.math.BigDecimal partnerChildPrice;

    private Boolean isActive;

    @NotNull(message = "TVA is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "TVA cannot be negative")
    @DecimalMax(value = "100.0", inclusive = true, message = "TVA cannot exceed 100%")
    private java.math.BigDecimal tva;

    // No `status` field here on purpose - status only moves through
    // submit-for-review/approve/reject, never a plain create/update, so a
    // client can't self-publish.
    private Boolean insuranceConfirmed;
    private Boolean complianceConfirmed;
    private Boolean copyrightConfirmed;
}