package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.SpokenLanguage;
import com.camping.duneinsolite.repository.SpokenLanguageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Turns the ids a request sends (Guide.languages, Reservation.preferredLanguages,
 * Extra/Tour/TourType.languages) into real {@link SpokenLanguage} entities.
 * Shared rather than duplicated per service - an unknown id fails closed
 * (the caller explicitly asked for that language) instead of being silently
 * dropped.
 */
@Component
@RequiredArgsConstructor
public class SpokenLanguageResolver {

    private final SpokenLanguageRepository spokenLanguageRepository;

    public Set<SpokenLanguage> resolve(Set<UUID> languageIds) {
        if (languageIds == null || languageIds.isEmpty()) return new HashSet<>();
        Set<SpokenLanguage> languages = new HashSet<>(spokenLanguageRepository.findAllById(languageIds));
        if (languages.size() != languageIds.size()) {
            throw new ResourceNotFoundException("One or more languages not found");
        }
        return languages;
    }
}
