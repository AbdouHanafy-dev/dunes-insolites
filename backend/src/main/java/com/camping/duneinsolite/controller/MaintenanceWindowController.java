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
// Was a single class-level @PreAuthorize("hasRole('ADMIN')") - see
// PageController's own comment for why this moved to per-method @perm
// checks. CAMPING/PARTENAIRE seed at NONE, matching today exactly.
@RestController
@RequestMapping("/api/maintenance-windows")
@RequiredArgsConstructor
public class MaintenanceWindowController {

    private final MaintenanceWindowService maintenanceWindowService;

    @PostMapping
    @PreAuthorize("@perm.can('MAINTENANCE_WINDOWS', 'FULL')")
    public ResponseEntity<MaintenanceWindowResponse> createMaintenanceWindow(
            @Valid @RequestBody MaintenanceWindowRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(maintenanceWindowService.createMaintenanceWindow(request));
    }

    @GetMapping("/{maintenanceId}")
    @PreAuthorize("@perm.can('MAINTENANCE_WINDOWS', 'READ')")
    public ResponseEntity<MaintenanceWindowResponse> getMaintenanceWindowById(@PathVariable UUID maintenanceId) {
        return ResponseEntity.ok(maintenanceWindowService.getMaintenanceWindowById(maintenanceId));
    }

    @GetMapping
    @PreAuthorize("@perm.can('MAINTENANCE_WINDOWS', 'READ')")
    public ResponseEntity<List<MaintenanceWindowResponse>> getAllMaintenanceWindows() {
        return ResponseEntity.ok(maintenanceWindowService.getAllMaintenanceWindows());
    }

    @PutMapping("/{maintenanceId}")
    @PreAuthorize("@perm.can('MAINTENANCE_WINDOWS', 'EDIT')")
    public ResponseEntity<MaintenanceWindowResponse> updateMaintenanceWindow(
            @PathVariable UUID maintenanceId, @Valid @RequestBody MaintenanceWindowRequest request) {
        return ResponseEntity.ok(maintenanceWindowService.updateMaintenanceWindow(maintenanceId, request));
    }

    @DeleteMapping("/{maintenanceId}")
    @PreAuthorize("@perm.can('MAINTENANCE_WINDOWS', 'FULL')")
    public ResponseEntity<Void> deleteMaintenanceWindow(@PathVariable UUID maintenanceId) {
        maintenanceWindowService.deleteMaintenanceWindow(maintenanceId);
        return ResponseEntity.noContent().build();
    }
}
