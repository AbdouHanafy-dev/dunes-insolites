package com.camping.duneinsolite.dto.request.publicapi;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** POST /api/public/subscribe. Field-for-field match of the vitrine's Newsletter.tsx. */
@Data
public class NewsletterSubscribeRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
}
