package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.GuideRequest;
import com.camping.duneinsolite.dto.request.GuideUpdateRequest;
import com.camping.duneinsolite.dto.response.GuideResponse;
import com.camping.duneinsolite.mapper.GuideMapper;
import com.camping.duneinsolite.model.Guide;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.SpokenLanguage;
import com.camping.duneinsolite.repository.GuideRepository;
import com.camping.duneinsolite.repository.ReservationRepository;
import com.camping.duneinsolite.repository.SpokenLanguageRepository;
import com.camping.duneinsolite.service.GuideService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GuideServiceImpl implements GuideService {

    private final GuideRepository guideRepository;
    private final ReservationRepository reservationRepository;
    private final SpokenLanguageRepository spokenLanguageRepository;
    private final GuideMapper guideMapper;

    @Override
    @Transactional
    public GuideResponse create(GuideRequest request) {
        Reservation reservation = reservationRepository.findById(request.getReservationId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Reservation not found: " + request.getReservationId()));
        Guide guide = guideMapper.toEntity(request);
        guide.setReservation(reservation);
        guide.setLanguages(resolveLanguages(request.getLanguageIds()));
        return guideMapper.toResponse(guideRepository.save(guide));
    }

    private Set<SpokenLanguage> resolveLanguages(Set<UUID> languageIds) {
        if (languageIds == null || languageIds.isEmpty()) return new HashSet<>();
        Set<SpokenLanguage> languages = new HashSet<>(spokenLanguageRepository.findAllById(languageIds));
        if (languages.size() != languageIds.size()) {
            throw new EntityNotFoundException("One or more languages not found");
        }
        return languages;
    }

    @Override
    @Transactional(readOnly = true)
    public GuideResponse getById(UUID id) {
        return guideMapper.toResponse(findOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuideResponse> getByReservation(UUID reservationId) {
        return guideRepository.findAllByReservation_ReservationId(reservationId)
                .stream()
                .map(guideMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GuideResponse> getAll(Pageable pageable) {
        return guideRepository.findAll(pageable).map(guideMapper::toResponse);
    }

    @Override
    @Transactional
    public GuideResponse update(UUID id, GuideUpdateRequest request) {
        Guide guide = findOrThrow(id);
        guideMapper.updateEntity(request, guide);
        if (request.getLanguageIds() != null) {
            guide.setLanguages(resolveLanguages(request.getLanguageIds()));
        }
        return guideMapper.toResponse(guideRepository.save(guide));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        guideRepository.delete(findOrThrow(id));
    }

    @Override
    @Transactional
    public void deleteAllByReservation(UUID reservationId) {
        guideRepository.deleteAllByReservation_ReservationId(reservationId);
    }

    private Guide findOrThrow(UUID id) {
        return guideRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Guide not found: " + id));
    }
}