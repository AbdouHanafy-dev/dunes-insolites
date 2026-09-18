package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.ChauffeurRequest;
import com.camping.duneinsolite.dto.request.ChauffeurUpdateRequest;
import com.camping.duneinsolite.dto.response.ChauffeurResponse;
import com.camping.duneinsolite.dto.response.DriverTripResponse;
import com.camping.duneinsolite.service.ChauffeurService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chauffeurs")
// Staff roster. Reads are staff-only; every mutation is narrowed to ADMIN on
// the method below. Previously this controller had no rule at all, so it fell
// through to anyRequest().authenticated() - any logged-in CLIENT could delete a driver.
@PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
@RequiredArgsConstructor
public class ChauffeurController {

    private final ChauffeurService chauffeurService;

    // A real driver's own view of their assignments - not a staff endpoint
    // at all, so it must override the class-level ADMIN/CAMPING rule above
    // (method-level @PreAuthorize always wins over class-level in Spring
    // Security) rather than widen it.
    @PreAuthorize("hasRole('CHAUFFEUR')")
    @GetMapping("/my-trips")
    public ResponseEntity<List<DriverTripResponse>> getMyTrips() {
        UUID driverUserId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        return ResponseEntity.ok(chauffeurService.getMyTrips(driverUserId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChauffeurResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(chauffeurService.getById(id));
    }

    @GetMapping("/reservation/{reservationId}")
    public ResponseEntity<List<ChauffeurResponse>> getByReservation(
            @PathVariable UUID reservationId) {
        return ResponseEntity.ok(chauffeurService.getByReservation(reservationId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}")
    public ResponseEntity<ChauffeurResponse> update(
            @PathVariable UUID id,
            @RequestBody ChauffeurUpdateRequest request) {
        return ResponseEntity.ok(chauffeurService.update(id, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        chauffeurService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/reservation/{reservationId}")
    public ResponseEntity<Void> deleteAllByReservation(@PathVariable UUID reservationId) {
        chauffeurService.deleteAllByReservation(reservationId);
        return ResponseEntity.noContent().build();
    }
}