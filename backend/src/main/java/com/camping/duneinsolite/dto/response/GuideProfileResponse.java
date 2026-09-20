package com.camping.duneinsolite.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Set;
import java.util.UUID;

@Data
@Builder
public class GuideProfileResponse {
    private UUID guideProfileId;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private Set<SpokenLanguageResponse> languages;
    private boolean active;
}
