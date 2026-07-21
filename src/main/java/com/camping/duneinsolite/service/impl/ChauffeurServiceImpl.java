package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ChauffeurRequest;
import com.camping.duneinsolite.dto.request.ChauffeurUpdateRequest;
import com.camping.duneinsolite.dto.response.ChauffeurResponse;
import com.camping.duneinsolite.mapper.ChauffeurMapper;
import com.camping.duneinsolite.model.Chauffeur;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.repository.ChauffeurRepository;
import com.camping.duneinsolite.repository.ReservationRepository;
import com.camping.duneinsolite.service.ChauffeurService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChauffeurServiceImpl implements ChauffeurService {

    private final ChauffeurRepository chauffeurRepository;
    private final ReservationRepository reservationRepository;
    private final ChauffeurMapper chauffeurMapper;

    @Override
    @Transactional
    public ChauffeurResponse create(ChauffeurRequest request) {
        Reservation reservation = reservationRepository.findById(request.getReservationId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Reservation not found: " + request.getReservationId()));
        Chauffeur chauffeur = chauffeurMapper.toEntity(request);
        chauffeur.setReservation(reservation);
        return chauffeurMapper.toResponse(chauffeurRepository.save(chauffeur));
    }

    @Override
    @Transactional(readOnly = true)
    public ChauffeurResponse getById(UUID id) {
        return chauffeurMapper.toResponse(findOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChauffeurResponse> getByReservation(UUID reservationId) {
        return chauffeurRepository.findAllByReservation_ReservationId(reservationId)
                .stream()
                .map(chauffeurMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ChauffeurResponse update(UUID id, ChauffeurUpdateRequest request) {
        Chauffeur chauffeur = findOrThrow(id);
        chauffeurMapper.updateEntity(request, chauffeur);
        return chauffeurMapper.toResponse(chauffeurRepository.save(chauffeur));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        chauffeurRepository.delete(findOrThrow(id));
    }

    @Override
    @Transactional
    public void deleteAllByReservation(UUID reservationId) {
        chauffeurRepository.deleteAllByReservation_ReservationId(reservationId);
    }

    private Chauffeur findOrThrow(UUID id) {
        return chauffeurRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Chauffeur not found: " + id));
    }
}