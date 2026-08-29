package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.MaintenanceWindowRequest;
import com.camping.duneinsolite.dto.response.MaintenanceWindowResponse;

import java.util.List;
import java.util.UUID;

public interface MaintenanceWindowService {
    MaintenanceWindowResponse createMaintenanceWindow(MaintenanceWindowRequest request);
    MaintenanceWindowResponse getMaintenanceWindowById(UUID maintenanceId);
    List<MaintenanceWindowResponse> getAllMaintenanceWindows();
    MaintenanceWindowResponse updateMaintenanceWindow(UUID maintenanceId, MaintenanceWindowRequest request);
    void deleteMaintenanceWindow(UUID maintenanceId);

    /** Vitrine-facing: every window currently in effect, for the frontend's own middleware to match against. */
    List<MaintenanceWindowResponse> getPublicActiveMaintenanceWindows();
}
