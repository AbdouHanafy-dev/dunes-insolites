package com.camping.duneinsolite.controller;


import com.camping.duneinsolite.dto.request.TourTypeRequest;
import com.camping.duneinsolite.dto.response.TourTypeResponse;
import com.camping.duneinsolite.service.TourTypeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tour-types")
@RequiredArgsConstructor
public class TourTypeController {

    private final TourTypeService tourTypeService;

    // Was hasAnyRole('ADMIN','CAMPING') for create/update, hasRole('ADMIN')
    // for delete - i.e. CAMPING could create+update but never delete, a
    // shape the matrix's 4 flat levels (NONE<READ<EDIT<FULL, FULL=create+
    // update+delete) can't express exactly. Seeded at FULL for CAMPING
    // (RolePermissionSeeder) as the closer real-world fit - camp staff
    // already manage this catalog day-to-day - which does grant delete as
    // a real, disclosed change from today. Set CAMPING to EDIT instead via
    // the admin "Roles & permissions" screen to get update-without-delete
    // back (at the cost of losing create, which EDIT doesn't include).
    @PostMapping
    @PreAuthorize("@perm.can('TOUR_TYPES', 'FULL')")
    public ResponseEntity<TourTypeResponse> createTourType(@Valid @RequestBody TourTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tourTypeService.createTourType(request));
    }

    @GetMapping("/{tourTypeId}")
    public ResponseEntity<TourTypeResponse> getTourTypeById(@PathVariable UUID tourTypeId) {
        return ResponseEntity.ok(tourTypeService.getTourTypeById(tourTypeId));
    }

    @GetMapping
    public ResponseEntity<List<TourTypeResponse>> getAllTourTypes() {
        return ResponseEntity.ok(tourTypeService.getAllTourTypes());
    }

    @PutMapping("/{tourTypeId}")
    @PreAuthorize("@perm.can('TOUR_TYPES', 'EDIT')")
    public ResponseEntity<TourTypeResponse> updateTourType(@PathVariable UUID tourTypeId,
                                                           @Valid @RequestBody TourTypeRequest request) {
        return ResponseEntity.ok(tourTypeService.updateTourType(tourTypeId, request));
    }

    @DeleteMapping("/{tourTypeId}")
    @PreAuthorize("@perm.can('TOUR_TYPES', 'FULL')")
    public ResponseEntity<Void> deleteTourType(@PathVariable UUID tourTypeId) {
        tourTypeService.deleteTourType(tourTypeId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{tourTypeId}/deactivate")
    @PreAuthorize("@perm.can('TOUR_TYPES', 'EDIT')")
    public ResponseEntity<TourTypeResponse> deactivateTourType(@PathVariable UUID tourTypeId) {
        return ResponseEntity.ok(tourTypeService.deactivateTourType(tourTypeId));
    }
}
