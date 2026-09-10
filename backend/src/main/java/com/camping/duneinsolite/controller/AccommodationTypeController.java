package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.AccommodationTypeRequest;
import com.camping.duneinsolite.dto.response.AccommodationTypeResponse;
import com.camping.duneinsolite.service.AccommodationTypeAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Accommodation tiers (Desert Tent / Room / Dune Suite) for a nuitée.
 * Same catalogue-permission model as Hébergements/TourTypes ({@code TOUR_TYPES}
 * resource). Reads require EDIT, writes require FULL.
 *
 * <p>No public GET here — the vitrine reads accommodations through
 * {@code GET /api/public/stays/{slug}} (only active + priced tiers).
 */
@RestController
@RequestMapping("/api/accommodation-types")
@RequiredArgsConstructor
public class AccommodationTypeController {

    private final AccommodationTypeAdminService service;

    @GetMapping
    @PreAuthorize("@perm.can('TOUR_TYPES', 'EDIT')")
    public List<AccommodationTypeResponse> list(@RequestParam(required = false) UUID tourTypeId) {
        return service.list(tourTypeId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@perm.can('TOUR_TYPES', 'EDIT')")
    public AccommodationTypeResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("@perm.can('TOUR_TYPES', 'FULL')")
    public ResponseEntity<AccommodationTypeResponse> create(@Valid @RequestBody AccommodationTypeRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.can('TOUR_TYPES', 'FULL')")
    public AccommodationTypeResponse update(@PathVariable UUID id, @Valid @RequestBody AccommodationTypeRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.can('TOUR_TYPES', 'FULL')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
