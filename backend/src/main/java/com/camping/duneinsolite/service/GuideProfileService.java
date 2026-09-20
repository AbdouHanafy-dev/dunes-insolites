package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.GuideProfileCreateRequest;
import com.camping.duneinsolite.dto.request.GuideProfileUpdateRequest;
import com.camping.duneinsolite.dto.response.GuideProfileResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.SpokenLanguageMapper;
import com.camping.duneinsolite.model.GuideProfile;
import com.camping.duneinsolite.model.SpokenLanguage;
import com.camping.duneinsolite.repository.GuideProfileRepository;
import com.camping.duneinsolite.repository.SpokenLanguageRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GuideProfileService {
    private final GuideProfileRepository repository;
    private final SpokenLanguageRepository languageRepository;
    private final SpokenLanguageMapper languageMapper;

    @Transactional(readOnly = true)
    public List<GuideProfileResponse> getAll() {
        return repository.findAllByOrderByActiveDescFirstNameAscLastNameAsc().stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public GuideProfile lockActiveEntity(UUID id) {
        return repository.lockActiveById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Active guide profile not found: " + id));
    }

    @Transactional
    public GuideProfileResponse create(GuideProfileCreateRequest request) {
        String email = blankToNull(request.getEmail());
        if (email != null && repository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("A guide profile already exists for this email");
        }
        GuideProfile profile = GuideProfile.builder()
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .email(email == null ? null : email.toLowerCase())
                .phoneNumber(blankToNull(request.getPhoneNumber()))
                .languages(resolveLanguages(request.getLanguageIds()))
                .active(true)
                .build();
        return toResponse(repository.save(profile));
    }

    @Transactional
    public GuideProfileResponse update(UUID id, GuideProfileUpdateRequest request) {
        GuideProfile profile = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Guide profile not found: " + id));
        if (request.getFirstName() != null && !request.getFirstName().isBlank()) profile.setFirstName(request.getFirstName().trim());
        if (request.getLastName() != null && !request.getLastName().isBlank()) profile.setLastName(request.getLastName().trim());
        if (request.getEmail() != null) {
            String email = blankToNull(request.getEmail());
            if (email != null && !email.equalsIgnoreCase(profile.getEmail()) && repository.existsByEmailIgnoreCase(email)) {
                throw new IllegalArgumentException("A guide profile already exists for this email");
            }
            profile.setEmail(email == null ? null : email.toLowerCase());
        }
        if (request.getPhoneNumber() != null) profile.setPhoneNumber(blankToNull(request.getPhoneNumber()));
        if (request.getLanguageIds() != null) profile.setLanguages(resolveLanguages(request.getLanguageIds()));
        if (request.getActive() != null) profile.setActive(request.getActive());
        return toResponse(repository.save(profile));
    }

    private Set<SpokenLanguage> resolveLanguages(Set<UUID> ids) {
        if (ids == null || ids.isEmpty()) return new HashSet<>();
        Set<SpokenLanguage> languages = new HashSet<>(languageRepository.findAllById(ids));
        if (languages.size() != ids.size()) throw new EntityNotFoundException("One or more languages not found");
        return languages;
    }

    private GuideProfileResponse toResponse(GuideProfile profile) {
        return GuideProfileResponse.builder()
                .guideProfileId(profile.getGuideProfileId())
                .firstName(profile.getFirstName())
                .lastName(profile.getLastName())
                .email(profile.getEmail())
                .phoneNumber(profile.getPhoneNumber())
                .languages(profile.getLanguages().stream().map(languageMapper::toResponse).collect(Collectors.toSet()))
                .active(profile.isActive())
                .build();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
