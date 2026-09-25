package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    @NotBlank(message = "Email is required")
    private String email;

    /** The site language the visitor is on; picks the language of the reset email. Optional. */
    private String locale;
}
