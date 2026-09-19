package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.Set;
import java.util.UUID;

@Data
public class GuideStaffRequest {
    @NotBlank(message = "First name is required")
    private String firstName;
    @NotBlank(message = "Last name is required")
    private String lastName;
    private String phoneNumber;
    // SpokenLanguage ids this guide can translate/guide in — used to match
    // against Reservation.preferredLanguages. Optional; null/empty means unset.
    private Set<UUID> languageIds;
}