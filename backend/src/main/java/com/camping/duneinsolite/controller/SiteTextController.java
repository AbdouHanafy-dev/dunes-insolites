package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.SiteTextRequest;
import com.camping.duneinsolite.service.SiteTextService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Wording of the site's booking forms. Reading is public (the site merges it into its messages
 * and caches it); writing is ADMIN only, declared here and by the /api/admin/** rule.
 */
@RestController
@RequiredArgsConstructor
public class SiteTextController {

    private final SiteTextService siteTextService;

    @GetMapping("/api/public/site-texts")
    public ResponseEntity<Map<String, Map<String, String>>> publicTexts() {
        return ResponseEntity.ok(siteTextService.all());
    }

    @GetMapping("/api/admin/site-texts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Map<String, String>>> adminTexts() {
        return ResponseEntity.ok(siteTextService.all());
    }

    @PutMapping("/api/admin/site-texts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> set(@Valid @RequestBody SiteTextRequest request) {
        siteTextService.set(request.getLocale(), request.getKey(), request.getValue());
        return ResponseEntity.noContent().build();
    }
}
