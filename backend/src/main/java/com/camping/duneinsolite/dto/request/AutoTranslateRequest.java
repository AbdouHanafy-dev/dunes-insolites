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

    // Circuit-only practical texts.
    @Size(max = 10000)
    private String goodToKnow;
    @Size(max = 5000)
    private String petPolicyNote;
    @Size(max = 5000)
    private String ticketInfo;
    @Size(max = 50)
    private List<String> notSuitableFor;
    @Size(max = 50)
    private List<String> notAllowed;
    @Size(max = 50)
    private List<String> mustBring;

    @NotEmpty(message = "At least one language is required")
    @Size(max = 5)
    private List<ContentLocale> locales;
}
