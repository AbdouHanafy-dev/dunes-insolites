package com.camping.duneinsolite.dto.request;

import lombok.Data;
import java.util.Set;
import java.util.UUID;

@Data
public class GuideUpdateRequest {
    private String firstName;
    private String lastName;
    private String phoneNumber;
    // null = leave languages untouched; a set (incl. empty) replaces it.
    private Set<UUID> languageIds;
}