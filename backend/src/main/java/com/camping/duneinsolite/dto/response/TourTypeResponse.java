package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.model.CancellationPolicy;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.GroupSizeType;
import lombok.Data;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
public class TourTypeResponse {
    private UUID tourTypeId;
    private String name;
    private String slug;
    private String description;
    private String duration;
    private Integer maxNights;
    private java.math.BigDecimal passengerAdultPrice;
    private java.math.BigDecimal passengerChildPrice;
    private java.math.BigDecimal passengerInfantPrice;
    private java.math.BigDecimal partnerAdultPrice;
    private java.math.BigDecimal partnerChildPrice;
    private java.math.BigDecimal tva;

    /** Cities the guest may depart from / be dropped back to; ticked in the backoffice. */
    private java.util.Set<com.camping.duneinsolite.model.enums.DepartureCity> departureCities;
    private java.util.Set<com.camping.duneinsolite.model.enums.DepartureCity> returnCities;

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
    private Set<SpokenLanguageResponse> languages;
    private CancellationPolicy cancellationPolicy;
    private String coverPhotoUrl;
    private List<Photo> photos;
    private Double averageRating;
    private Integer reviewCount;
    private List<CatalogTranslationDto> translations;
}