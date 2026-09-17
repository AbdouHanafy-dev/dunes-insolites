package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.model.CancellationPolicy;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.GroupSizeType;
import com.camping.duneinsolite.model.enums.Language;
import lombok.Data;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
public class TourResponse {
    private UUID tourId;
    private String name;
    private String slug;
    private String description;
    private String duration;
    private java.math.BigDecimal passengerAdultPrice;
    private java.math.BigDecimal passengerChildPrice;
    private java.math.BigDecimal partnerAdultPrice;
    private java.math.BigDecimal partnerChildPrice;
    private Boolean isActive;
    private java.math.BigDecimal tva;

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
    private String coverPhotoUrl;
    private List<Photo> photos;
    private List<CatalogTranslationDto> translations;
    private Double averageRating;
    private Integer reviewCount;
}