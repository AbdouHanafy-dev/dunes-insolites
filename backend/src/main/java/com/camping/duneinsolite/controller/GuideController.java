package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.GuideRequest;
import com.camping.duneinsolite.dto.request.GuideUpdateRequest;
import com.camping.duneinsolite.dto.response.GuideResponse;
import com.camping.duneinsolite.service.GuideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/guides")
// Staff roster. Reads are staff-only; every mutation is narrowed to ADMIN on
// the method below. Previously this controller had no rule at all, so it fell
// through to anyRequest().authenticated() - any logged-in CLIENT could delete a guide.
@PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
@RequiredArgsConstructor
public class GuideController {

    private final GuideService guideService;


    // Every guide across every reservation - the backoffice roster page
    // (admin/app/(app)/guides). Separate from getByReservation, which is
    // scoped to one reservation's staff panel.
    @GetMapping
    public ResponseEntity<Page<GuideResponse>> getAll(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(guideService.getAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GuideResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(guideService.getById(id));
    }

    @GetMapping("/reservation/{reservationId}")
    public ResponseEntity<List<GuideResponse>> getByReservation(
            @PathVariable UUID reservationId) {
        return ResponseEntity.ok(guideService.getByReservation(reservationId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}")
    public ResponseEntity<GuideResponse> update(
            @PathVariable UUID id,
            @RequestBody GuideUpdateRequest request) {
        return ResponseEntity.ok(guideService.update(id, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        guideService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/reservation/{reservationId}")
    public ResponseEntity<Void> deleteAllByReservation(@PathVariable UUID reservationId) {
        guideService.deleteAllByReservation(reservationId);
        return ResponseEntity.noContent().build();
    }
}