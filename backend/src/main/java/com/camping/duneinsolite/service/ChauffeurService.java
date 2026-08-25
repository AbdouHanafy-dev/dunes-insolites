package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.ChauffeurRequest;
import com.camping.duneinsolite.dto.request.ChauffeurUpdateRequest;
import com.camping.duneinsolite.dto.response.ChauffeurResponse;
import java.util.List;
import java.util.UUID;

public interface ChauffeurService {
    ChauffeurResponse create(ChauffeurRequest request);
    ChauffeurResponse getById(UUID id);
    List<ChauffeurResponse> getByReservation(UUID reservationId);
    ChauffeurResponse update(UUID id, ChauffeurUpdateRequest request);
    void delete(UUID id);
    void deleteAllByReservation(UUID reservationId);
}