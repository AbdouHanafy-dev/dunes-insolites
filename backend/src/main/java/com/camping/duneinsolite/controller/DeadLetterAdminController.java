package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.response.DeadLetterMessageResponse;
import com.camping.duneinsolite.model.enums.DeadLetterStatus;
import com.camping.duneinsolite.service.DeadLetterAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Operations surface for the transactional-email dead-letter queue
 * (production-hardening item 2). ADMIN only - both by the class-level
 * {@code @PreAuthorize} here and the blanket {@code /api/admin/**} rule in
 * SecurityConfig. Authorization is enforced server-side; the admin UI merely
 * mirrors it.
 *
 * <p><b>Company scoping:</b> a dead-letter record can reference a reservation,
 * but {@code Reservation} has no company dimension yet (tracked debt #4-7), so
 * per-entity filtering is not possible here today. When company scoping lands,
 * this listing must be filtered by the caller's company claim.
 */
@RestController
@RequestMapping("/api/admin/ops/dead-letters")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DeadLetterAdminController {

    private final DeadLetterAdminService service;

    @GetMapping
    public Page<DeadLetterMessageResponse> list(
            @RequestParam(required = false) DeadLetterStatus status,
            @PageableDefault(size = 50) Pageable pageable) {
        return service.list(status, pageable).map(DeadLetterMessageResponse::from);
    }

    @GetMapping("/{id}")
    public DeadLetterMessageResponse get(@PathVariable UUID id) {
        return DeadLetterMessageResponse.from(service.get(id));
    }

    @PostMapping("/{id}/replay")
    public ResponseEntity<DeadLetterMessageResponse> replay(
            @PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(DeadLetterMessageResponse.from(service.replay(id, jwt.getSubject())));
    }

    @PostMapping("/{id}/discard")
    public ResponseEntity<DeadLetterMessageResponse> discard(
            @PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(DeadLetterMessageResponse.from(service.discard(id, jwt.getSubject())));
    }
}
