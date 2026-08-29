package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.MaintenanceWindowRequest;
import com.camping.duneinsolite.dto.response.MaintenanceWindowResponse;
import com.camping.duneinsolite.service.MaintenanceWindowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Per-page maintenance windows — takes one page down with a "back soon" (and
 * optional countdown), without touching the rest of the vitrine. See
 * MaintenanceWindow's own doc comment. ADMIN-only, same as RedirectController.
 */
@RestController
@RequestMapping("/api/maintenance-windows")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class MaintenanceWindowController {

    private final MaintenanceWindowService maintenanceWindowService;

    @PostMapping
    public ResponseEntity<MaintenanceWindowResponse> createMaintenanceWindow(
            @Valid @RequestBody MaintenanceWindowRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(maintenanceWindowService.createMaintenanceWindow(request));
    }

    @GetMapping("/{maintenanceId}")
    public ResponseEntity<MaintenanceWindowResponse> getMaintenanceWindowById(@PathVariable UUID maintenanceId) {
        return ResponseEntity.ok(maintenanceWindowService.getMaintenanceWindowById(maintenanceId));
    }

    @GetMapping
    public ResponseEntity<List<MaintenanceWindowResponse>> getAllMaintenanceWindows() {
        return ResponseEntity.ok(maintenanceWindowService.getAllMaintenanceWindows());
    }

    @PutMapping("/{maintenanceId}")
    public ResponseEntity<MaintenanceWindowResponse> updateMaintenanceWindow(
            @PathVariable UUID maintenanceId, @Valid @RequestBody MaintenanceWindowRequest request) {
        return ResponseEntity.ok(maintenanceWindowService.updateMaintenanceWindow(maintenanceId, request));
    }

    @DeleteMapping("/{maintenanceId}")
    public ResponseEntity<Void> deleteMaintenanceWindow(@PathVariable UUID maintenanceId) {
        maintenanceWindowService.deleteMaintenanceWindow(maintenanceId);
        return ResponseEntity.noContent().build();
    }
}
