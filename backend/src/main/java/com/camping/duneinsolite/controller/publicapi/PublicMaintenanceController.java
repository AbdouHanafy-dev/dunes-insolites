package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.MaintenanceWindowResponse;
import com.camping.duneinsolite.service.MaintenanceWindowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Unauthenticated, currently-active maintenance windows only - see
 * SecurityConfig, /api/public/** is permitAll. The frontend's own
 * middleware.ts fetches this (cached, not per-request) and matches the
 * incoming path before falling through to normal routing, same pattern as
 * PublicRedirectController. An empty list is normal: nothing under
 * maintenance is not an error.
 */
@RestController
@RequestMapping("/api/public/maintenance-windows")
@RequiredArgsConstructor
public class PublicMaintenanceController {

    private final MaintenanceWindowService maintenanceWindowService;

    @GetMapping
    public ResponseEntity<List<MaintenanceWindowResponse>> getActiveMaintenanceWindows() {
        return ResponseEntity.ok(maintenanceWindowService.getPublicActiveMaintenanceWindows());
    }
}
