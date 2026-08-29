package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.MaintenanceWindowRequest;
import com.camping.duneinsolite.dto.response.MaintenanceWindowResponse;
import com.camping.duneinsolite.exception.MaintenanceConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.MaintenanceWindowMapper;
import com.camping.duneinsolite.model.MaintenanceWindow;
import com.camping.duneinsolite.repository.MaintenanceWindowRepository;
import com.camping.duneinsolite.service.MaintenanceWindowService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MaintenanceWindowServiceImpl implements MaintenanceWindowService {

    private final MaintenanceWindowRepository maintenanceWindowRepository;
    private final MaintenanceWindowMapper maintenanceWindowMapper;

    @Override
    public MaintenanceWindowResponse createMaintenanceWindow(MaintenanceWindowRequest request) {
        validate(request, null);
        MaintenanceWindow window = maintenanceWindowMapper.toEntity(request);
        if (window.getIsActive() == null) window.setIsActive(true);
        return maintenanceWindowMapper.toResponse(maintenanceWindowRepository.save(window));
    }

    @Override
    @Transactional(readOnly = true)
    public MaintenanceWindowResponse getMaintenanceWindowById(UUID maintenanceId) {
        return maintenanceWindowMapper.toResponse(findById(maintenanceId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceWindowResponse> getAllMaintenanceWindows() {
        return maintenanceWindowRepository.findAllByOrderByPathAsc().stream()
                .map(maintenanceWindowMapper::toResponse).toList();
    }

    @Override
    public MaintenanceWindowResponse updateMaintenanceWindow(UUID maintenanceId, MaintenanceWindowRequest request) {
        MaintenanceWindow window = findById(maintenanceId);
        validate(request, maintenanceId);
        maintenanceWindowMapper.updateEntity(request, window);
        return maintenanceWindowMapper.toResponse(maintenanceWindowRepository.save(window));
    }

    @Override
    public void deleteMaintenanceWindow(UUID maintenanceId) {
        maintenanceWindowRepository.delete(findById(maintenanceId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceWindowResponse> getPublicActiveMaintenanceWindows() {
        return maintenanceWindowRepository.findAllCurrentlyActive(LocalDateTime.now()).stream()
                .map(maintenanceWindowMapper::toResponse).toList();
    }

    // Two windows for the same path is ambiguous - reject it before it ever
    // reaches the DB's unique constraint as a raw, unhelpful 500. Same shape
    // as RedirectServiceImpl's own validate().
    private void validate(MaintenanceWindowRequest request, UUID editingId) {
        maintenanceWindowRepository.findByPath(request.getPath()).ifPresent(existing -> {
            if (!existing.getMaintenanceId().equals(editingId)) {
                throw new MaintenanceConflictException(
                        "A maintenance window for \"" + request.getPath() + "\" already exists.");
            }
        });
    }

    private MaintenanceWindow findById(UUID maintenanceId) {
        return maintenanceWindowRepository.findById(maintenanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance window not found: " + maintenanceId));
    }
}
