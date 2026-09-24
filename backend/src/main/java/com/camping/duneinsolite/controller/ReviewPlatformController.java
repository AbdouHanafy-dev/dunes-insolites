package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.ReviewPlatformRequest;
import com.camping.duneinsolite.dto.response.ReviewPlatformResponse;
import com.camping.duneinsolite.service.ReviewPlatformService;
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
 * The review platforms (Google, TripAdvisor, ...) and the colour each one
 * is shown in. Same permission as the reviews themselves — REVIEWS — and,
 * like them, no class-level URL rule.
 */
@RestController
@RequestMapping("/api/review-platforms")
@RequiredArgsConstructor
public class ReviewPlatformController {

    private final ReviewPlatformService platformService;

    @GetMapping
    @PreAuthorize("@perm.can('REVIEWS', 'READ')")
    public ResponseEntity<List<ReviewPlatformResponse>> getAll() {
        return ResponseEntity.ok(platformService.getAll());
    }

    @PostMapping
    @PreAuthorize("@perm.can('REVIEWS', 'FULL')")
    public ResponseEntity<ReviewPlatformResponse> create(@Valid @RequestBody ReviewPlatformRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(platformService.create(request));
    }

    @PutMapping("/{platformId}")
    @PreAuthorize("@perm.can('REVIEWS', 'EDIT')")
    public ResponseEntity<ReviewPlatformResponse> update(
            @PathVariable UUID platformId, @Valid @RequestBody ReviewPlatformRequest request) {
        return ResponseEntity.ok(platformService.update(platformId, request));
    }

    @DeleteMapping("/{platformId}")
    @PreAuthorize("@perm.can('REVIEWS', 'FULL')")
    public ResponseEntity<Void> delete(@PathVariable UUID platformId) {
        platformService.delete(platformId);
        return ResponseEntity.noContent().build();
    }
}
