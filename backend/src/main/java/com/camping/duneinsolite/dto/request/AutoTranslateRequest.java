package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.ContentLocale;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * The French copy currently in an admin form (saved or not) and the languages to
 * produce. Stateless on purpose: it translates what is on screen, so the button
 * works on a record that does not exist yet.
 */
@Data
public class AutoTranslateRequest {

    @Size(max = 500)
    private String name;
    @Size(max = 5000)
    private String description;
    @Size(max = 20000)
    private String aboutText;
    @Size(max = 50)
    private List<String> highlights;
    @Size(max = 50)
    private List<String> includedItems;
    @Size(max = 50)
    private List<String> notIncludedItems;
    @Size(max = 30)
    private List<ProgramStep> programSteps;

    @NotEmpty(message = "At least one language is required")
    @Size(max = 5)
    private List<ContentLocale> locales;
}
