package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.ChauffeurRequest;
import com.camping.duneinsolite.dto.request.ChauffeurUpdateRequest;
import com.camping.duneinsolite.dto.response.ChauffeurResponse;
import com.camping.duneinsolite.dto.response.DriverTripResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;

public interface ChauffeurService {
    ChauffeurResponse create(ChauffeurRequest request);
    ChauffeurResponse getById(UUID id);
    List<ChauffeurResponse> getByReservation(UUID reservationId);
    // Every Chauffeur across every reservation - the backoffice roster view.
    Page<ChauffeurResponse> getAll(Pageable pageable);
    ChauffeurResponse update(UUID id, ChauffeurUpdateRequest request);
    void delete(UUID id);
    void deleteAllByReservation(UUID reservationId);
    List<DriverTripResponse> getMyTrips(UUID driverUserId);
}