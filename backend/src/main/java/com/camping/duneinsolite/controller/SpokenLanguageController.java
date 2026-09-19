package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.SpokenLanguageRequest;
import com.camping.duneinsolite.dto.request.SpokenLanguageUpdateRequest;
import com.camping.duneinsolite.dto.response.SpokenLanguageResponse;
import com.camping.duneinsolite.service.SpokenLanguageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * The admin-managed language catalog behind Guide.languages and
 * Reservation.preferredLanguages — replaces the old hardcoded FR/EN/AR
 * enum. Reads are staff-only (the reservation staff panel and the language
 * management screen both need every language, including inactive ones);
 * the public booking form uses PublicLanguageController instead.
 */
@RestController
@RequestMapping("/api/languages")
@PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
@RequiredArgsConstructor
public class SpokenLanguageController {

    private final SpokenLanguageService spokenLanguageService;

    @GetMapping
    public ResponseEntity<List<SpokenLanguageResponse>> getAll() {
        return ResponseEntity.ok(spokenLanguageService.getAll());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<SpokenLanguageResponse> create(@Valid @RequestBody SpokenLanguageRequest request) {
        return ResponseEntity.ok(spokenLanguageService.create(request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}")
    public ResponseEntity<SpokenLanguageResponse> update(
            @PathVariable UUID id, @RequestBody SpokenLanguageUpdateRequest request) {
        return ResponseEntity.ok(spokenLanguageService.update(id, request));
    }
}
