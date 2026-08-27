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
}
