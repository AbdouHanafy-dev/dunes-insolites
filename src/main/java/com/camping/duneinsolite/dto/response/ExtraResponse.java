package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.CancellationPolicy;
import com.camping.duneinsolite.model.ExtraDuration;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.GroupSizeType;
import com.camping.duneinsolite.model.enums.Language;
import lombok.Data;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
public class ExtraResponse {
    private UUID extraId;
    private String name;
    private String description;
    private String duration;
    private Double unitPrice;
    private Boolean isActive;
    private Double tva;

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
    private Double averageRating;
    private Integer reviewCount;
}