package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** One wording of one site message in one language. A blank value puts the site's own text back. */
@Data
public class SiteTextRequest {

    @NotBlank
    @Pattern(regexp = "fr|en|de|it|da|ar", message = "Unknown language")
    private String locale;

    /** Dotted message path, e.g. {@code tourBookingForm.upgradeLabel}. */
    @NotBlank
    @Size(max = 160)
    @Pattern(regexp = "[A-Za-z][A-Za-z0-9]*([.][A-Za-z][A-Za-z0-9_]*)+", message = "Invalid message key")
    private String key;

    @Size(max = 600)
    private String value;
}
