package com.camping.duneinsolite.dto;

import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.ContentLocale;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * One locale's worth of translated copy on a TourType/Extra admin
 * request/response - shared shape for both, since TourTypeTranslation and
 * ExtraTranslation carry identical fields. See CatalogTranslation.
 */
@Data
public class CatalogTranslationDto {

    @NotNull(message = "Locale is required")
    private ContentLocale locale;

    private String name;
    private String description;
    private String aboutText;
    private List<String> highlights;
    private List<String> includedItems;
    private List<String> notIncludedItems;
    private List<ProgramStep> programSteps;

    // Circuit-only practical texts; null/empty for a TourType or Extra, which have no slot for them.
    private String goodToKnow;
    private String petPolicyNote;
    private String ticketInfo;
    private List<String> notSuitableFor;
    private List<String> notAllowed;
    private List<String> mustBring;

    // Review tracking: set by the back office, stored as given.
    private com.camping.duneinsolite.model.enums.TranslationReviewStatus reviewStatus;
    private String sourceHash;
}
