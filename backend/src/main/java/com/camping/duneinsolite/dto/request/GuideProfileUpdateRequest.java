package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.Email;
import lombok.Data;

import java.util.Set;
import java.util.UUID;

@Data
public class GuideProfileUpdateRequest {
    private String firstName;
    private String lastName;
    @Email private String email;
    private String phoneNumber;
    private Set<UUID> languageIds;
    private Boolean active;
}
