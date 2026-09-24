package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.ExternalReviewRequest;
import com.camping.duneinsolite.dto.response.ExternalReviewResponse;
import com.camping.duneinsolite.service.ExternalReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Back-office management of reviews copied from other platforms (Google,
 * TripAdvisor, ...). No class-level URL rule — falls through to
 * anyRequest().authenticated() — so every method is narrowed by the
 * REVIEWS permission. The public read is GET /api/public/reviews, which
 * merges these in.
 */
@RestController
@RequestMapping("/api/external-reviews")
@RequiredArgsConstructor
public class ExternalReviewController {

    private final ExternalReviewService externalReviewService;

    @GetMapping
    @PreAuthorize("@perm.can('REVIEWS', 'READ')")
    public ResponseEntity<List<ExternalReviewResponse>> getAll() {
        return ResponseEntity.ok(externalReviewService.getAll());
    }

    @PostMapping
    @PreAuthorize("@perm.can('REVIEWS', 'FULL')")
    public ResponseEntity<ExternalReviewResponse> create(@Valid @RequestBody ExternalReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(externalReviewService.create(request));
    }

    @PutMapping("/{externalReviewId}")
    @PreAuthorize("@perm.can('REVIEWS', 'EDIT')")
    public ResponseEntity<ExternalReviewResponse> update(
            @PathVariable UUID externalReviewId, @Valid @RequestBody ExternalReviewRequest request) {
        return ResponseEntity.ok(externalReviewService.update(externalReviewId, request));
    }

    @DeleteMapping("/{externalReviewId}")
    @PreAuthorize("@perm.can('REVIEWS', 'FULL')")
    public ResponseEntity<Void> delete(@PathVariable UUID externalReviewId) {
        externalReviewService.delete(externalReviewId);
        return ResponseEntity.noContent().build();
    }
}
