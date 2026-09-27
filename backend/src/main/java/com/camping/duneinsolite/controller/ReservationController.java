package com.camping.duneinsolite.controller;


import com.camping.duneinsolite.dto.request.*;
import com.camping.duneinsolite.dto.response.CampingStatsResponse;
import com.camping.duneinsolite.dto.response.InvoiceResponse;
import com.camping.duneinsolite.dto.response.ReservationResponse;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import com.camping.duneinsolite.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;
// ajoute d'une extras de la 1 ere fois
    @PostMapping
    @PreAuthorize("hasAnyRole('CLIENT', 'PARTENAIRE','ADMIN', 'CAMPING')")
    public ResponseEntity<ReservationResponse> createReservation(@Valid @RequestBody ReservationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reservationService.createReservation(request));
    }

    @GetMapping("/{reservationId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReservationResponse> getReservationById(@PathVariable UUID reservationId) {
        return ResponseEntity.ok(reservationService.getReservationById(reservationId));
    }
    @PostMapping("/{reservationId}/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReservationResponse> addStaff(
            @PathVariable UUID reservationId,
            @Valid @RequestBody ReservationStaffRequest request) {
        return ResponseEntity.ok(reservationService.addStaffToReservation(reservationId, request));
    }

    // Only this list endpoint and /active below are matrix-governed. Every
    // other endpoint on this controller is either ownership-scoped self-
    // service (shared with CLIENT/PARTENAIRE booking their own trip - see
    // e.g. updateReservation, updateStatus) or a genuinely sensitive,
    // deliberately ADMIN-only action (hard delete, staff assignment,
    // invoice generation) that this session's own cascade-fix work treated
    // as too high-stakes to make delegable - both stay hardcoded exactly
    // as before. RESERVATIONS in the matrix therefore only ever reaches
    // READ in practice today; that's honest, not an oversight.
    @GetMapping
    @PreAuthorize("@perm.can('RESERVATIONS', 'READ')")
    public ResponseEntity<Page<ReservationResponse>> getAllReservations(@PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reservationService.getAllReservations(pageable));
    }

    // CLIENT/PARTENAIRE may only fetch their own reservations (userId must match
    // their JWT subject) - ADMIN/CAMPING can fetch anyone's.
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING') or #userId.toString() == authentication.name")
    public ResponseEntity<List<ReservationResponse>> getReservationsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(reservationService.getReservationsByUser(userId));
    }

    // Same as above, filtered to PENDING/CONFIRMED/CANCELLED/CHECKED_IN/REJECTED only (excludes COMPLETED).
    // Same ownership rule: CLIENT/PARTENAIRE only their own, ADMIN/CAMPING anyone's.
    @GetMapping("/user/{userId}/non-completed")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING') or #userId.toString() == authentication.name")
    public ResponseEntity<List<ReservationResponse>> getNonCompletedReservationsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(reservationService.getNonCompletedReservationsByUser(userId));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<Page<ReservationResponse>> getReservationsByStatus(
            @PathVariable ReservationStatus status,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reservationService.getReservationsByStatus(status, pageable));
    }
    @GetMapping("/active")
    @PreAuthorize("@perm.can('RESERVATIONS', 'READ')")
    public ResponseEntity<Page<ReservationResponse>> getActiveReservations(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @PageableDefault(size = 10) Pageable pageable) {
        if (date != null) {
            return ResponseEntity.ok(reservationService.getActiveReservationsByDate(date, pageable));
        }
        return ResponseEntity.ok(reservationService.getActiveReservations(pageable));
    }

    @PatchMapping("/{reservationId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING', 'PARTENAIRE', 'CLIENT')")
    public ResponseEntity<ReservationResponse> updateStatus(
            @PathVariable UUID reservationId,
            @RequestParam ReservationStatus status,
            @RequestParam(required = false) String rejectionReason,
            @RequestParam(required = false) CompanyType companyType,
            @RequestParam(required = false) String link) {
        return ResponseEntity.ok(reservationService.updateReservationStatus(reservationId, status, rejectionReason, companyType, link));
    }

    @PutMapping("/{reservationId}")
    @PreAuthorize("hasAnyRole('CLIENT', 'PARTENAIRE', 'ADMIN')")
    public ResponseEntity<ReservationResponse> updateReservation(
            @PathVariable UUID reservationId,
            @Valid @RequestBody ReservationUpdateRequest request) {
        return ResponseEntity.ok(reservationService.updateReservation(reservationId, request));
    }

    @DeleteMapping("/{reservationId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteReservation(@PathVariable UUID reservationId) {
        reservationService.deleteReservation(reservationId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my-reservations")
    @PreAuthorize("hasAnyRole('CLIENT', 'PARTENAIRE')")
    public ResponseEntity<List<ReservationResponse>> getMyReservations() {
        String userId = SecurityContextHolder.getContext()
                .getAuthentication().getName(); // gets the userId from the JWT
        return ResponseEntity.ok(reservationService.getMyReservations(UUID.fromString(userId)));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<Page<ReservationResponse>> searchByName(
            @RequestParam String name,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reservationService.searchReservationsByName(name, pageable));
    }
    @GetMapping("/by-date")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<Page<ReservationResponse>> getByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reservationService.getReservationsByDate(date, pageable));
    }

    @GetMapping("/filter")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<Page<ReservationResponse>> getReservationsFiltered(
            @RequestParam(required = false) ReservationStatus status,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reservationService.getReservationsFiltered(status, name, date, pageable));
    }

    // Support-team field: where to meet the guest. Deliberately open to
    // CAMPING as well as ADMIN, and not gated on reservation status - the
    // meet-up is arranged right up to the day.
    @PatchMapping("/{reservationId}/meet-up-place")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<ReservationResponse> updateMeetUpPlace(
            @PathVariable UUID reservationId,
            @Valid @RequestBody MeetUpPlaceRequest request) {
        return ResponseEntity.ok(reservationService.updateMeetUpPlace(reservationId, request.getMeetUpPlace()));
    }

    // One-off traceability tool (StaffBookingNotifier was added 27 Sep 2026): sends the team's
    // "confirmed" e-mail for site bookings that were already confirmed before then. Idempotent -
    // safe to click more than once, a reservation it already covered is never mailed twice.
    @PostMapping("/backfill-staff-confirmation-emails")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<com.camping.duneinsolite.dto.response.StaffEmailBackfillResponse> backfillStaffConfirmationEmails() {
        return ResponseEntity.ok(reservationService.backfillStaffConfirmationEmails());
    }

    // Support-team edit of a booked circuit's return city and paid options. Prices come from the
    // catalogue, never from the request.
    @PutMapping("/{reservationId}/circuit-options")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<ReservationResponse> updateCircuitOptions(
            @PathVariable UUID reservationId,
            @Valid @RequestBody CircuitOptionsRequest request) {
        return ResponseEntity.ok(reservationService.updateCircuitOptions(reservationId, request));
    }

    // ── Staff management — ADMIN only

    @PatchMapping("/{reservationId}/staff/guides/{guideId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReservationResponse> updateGuide(
            @PathVariable UUID reservationId,
            @PathVariable UUID guideId,
            @RequestBody GuideUpdateRequest request) {
        return ResponseEntity.ok(
                reservationService.updateGuide(reservationId, guideId, request));
    }

    @DeleteMapping("/{reservationId}/staff/guides/{guideId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteGuide(
            @PathVariable UUID reservationId,
            @PathVariable UUID guideId) {
        return ResponseEntity.ok(
                reservationService.deleteGuide(reservationId, guideId));
    }

    @PatchMapping("/{reservationId}/staff/chauffeurs/{chauffeurId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReservationResponse> updateChauffeur(
            @PathVariable UUID reservationId,
            @PathVariable UUID chauffeurId,
            @RequestBody ChauffeurUpdateRequest request) {
        return ResponseEntity.ok(
                reservationService.updateChauffeur(reservationId, chauffeurId, request));
    }

    @DeleteMapping("/{reservationId}/staff/chauffeurs/{chauffeurId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteChauffeur(
            @PathVariable UUID reservationId,
            @PathVariable UUID chauffeurId) {
        return ResponseEntity.ok(
                reservationService.deleteChauffeur(reservationId, chauffeurId));
    }
    @GetMapping("/camping/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<Page<ReservationResponse>> getCampingActiveReservations(
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reservationService.getCampingActiveReservations(pageable));
    }

    @GetMapping("/camping/by-date")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<Page<ReservationResponse>> getCampingActiveByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reservationService.getCampingActiveReservationsByDate(date, pageable));
    }

    @GetMapping("/camping/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<Page<ReservationResponse>> searchCampingByName(
            @RequestParam String name,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reservationService.searchCampingReservationsByName(name, pageable));
    }

    @GetMapping("/camping/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<Page<ReservationResponse>> getCampingByStatus(
            @RequestParam ReservationStatus status,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reservationService.getCampingReservationsByStatus(status, pageable));
    }

    @GetMapping("/camping/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<CampingStatsResponse> getCampingStats() {
        return ResponseEntity.ok(reservationService.getCampingStats());
    }

    @PostMapping("/{reservationId}/generate-facture")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InvoiceResponse> generateFactureLater(
            @PathVariable UUID reservationId,
            @RequestParam CompanyType companyType) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationService.generateFactureLater(reservationId, companyType));
    }
}

