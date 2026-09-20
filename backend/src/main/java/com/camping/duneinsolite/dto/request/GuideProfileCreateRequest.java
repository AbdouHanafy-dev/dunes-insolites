package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Set;
import java.util.UUID;

@Data
public class GuideProfileCreateRequest {
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @Email private String email;
    private String phoneNumber;
    private Set<UUID> languageIds;
}
