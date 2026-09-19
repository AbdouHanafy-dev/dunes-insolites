package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.SpokenLanguageRequest;
import com.camping.duneinsolite.dto.request.SpokenLanguageUpdateRequest;
import com.camping.duneinsolite.dto.response.SpokenLanguageResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.SpokenLanguageMapper;
import com.camping.duneinsolite.model.SpokenLanguage;
import com.camping.duneinsolite.repository.SpokenLanguageRepository;
import com.camping.duneinsolite.service.SpokenLanguageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpokenLanguageServiceImpl implements SpokenLanguageService {

    private final SpokenLanguageRepository spokenLanguageRepository;
    private final SpokenLanguageMapper spokenLanguageMapper;

    @Override
    @Transactional
    public SpokenLanguageResponse create(SpokenLanguageRequest request) {
        String name = request.getName().trim();
        spokenLanguageRepository.findAllByOrderByNameAsc().stream()
                .filter(l -> l.getName().equalsIgnoreCase(name))
                .findAny()
                .ifPresent(l -> {
                    throw new ConflictException("A language named \"" + name + "\" already exists");
                });
        SpokenLanguage saved = spokenLanguageRepository.save(
                SpokenLanguage.builder().name(name).active(true).build());
        return spokenLanguageMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SpokenLanguageResponse> getAll() {
        return spokenLanguageRepository.findAllByOrderByNameAsc().stream()
                .map(spokenLanguageMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SpokenLanguageResponse> getAllActive() {
        return spokenLanguageRepository.findAllByActiveTrueOrderByNameAsc().stream()
                .map(spokenLanguageMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public SpokenLanguageResponse update(UUID id, SpokenLanguageUpdateRequest request) {
        SpokenLanguage language = spokenLanguageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Language not found: " + id));
        if (request.getName() != null && !request.getName().isBlank()) {
            language.setName(request.getName().trim());
        }
        if (request.getActive() != null) {
            language.setActive(request.getActive());
        }
        return spokenLanguageMapper.toResponse(spokenLanguageRepository.save(language));
    }
}
