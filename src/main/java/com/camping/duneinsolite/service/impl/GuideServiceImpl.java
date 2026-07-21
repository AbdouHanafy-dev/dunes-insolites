package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.GuideRequest;
import com.camping.duneinsolite.dto.request.GuideUpdateRequest;
import com.camping.duneinsolite.dto.response.GuideResponse;
import com.camping.duneinsolite.mapper.GuideMapper;
import com.camping.duneinsolite.model.Guide;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.repository.GuideRepository;
import com.camping.duneinsolite.repository.ReservationRepository;
import com.camping.duneinsolite.service.GuideService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GuideServiceImpl implements GuideService {

    private final GuideRepository guideRepository;
    private final ReservationRepository reservationRepository;
    private final GuideMapper guideMapper;

    @Override
    @Transactional
    public GuideResponse create(GuideRequest request) {
        Reservation reservation = reservationRepository.findById(request.getReservationId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Reservation not found: " + request.getReservationId()));
        Guide guide = guideMapper.toEntity(request);
        guide.setReservation(reservation);
        return guideMapper.toResponse(guideRepository.save(guide));
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
    @Transactional
    public GuideResponse update(UUID id, GuideUpdateRequest request) {
        Guide guide = findOrThrow(id);
        guideMapper.updateEntity(request, guide);
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