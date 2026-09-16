package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.SiteSettingsRequest;
import com.camping.duneinsolite.dto.response.SiteSettingsResponse;
import com.camping.duneinsolite.service.SiteSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Admin-facing side of the vitrine's business-fact settings (contact
 * info, social links, headline stats) - see PublicSiteSettingsController
 * for the public GET every visitor's page render actually uses. Write
 * side hardcoded ADMIN, same reasoning as CampingSettingsController's own
 * comment: too small/global a config surface for a per-resource matrix row.
 */
@RestController
@RequestMapping("/api/site-settings")
@RequiredArgsConstructor
public class SiteSettingsController {

    private final SiteSettingsService siteSettingsService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SiteSettingsResponse> getSettings() {
        return ResponseEntity.ok(siteSettingsService.getSettings());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SiteSettingsResponse> updateSettings(@Valid @RequestBody SiteSettingsRequest request) {
        return ResponseEntity.ok(siteSettingsService.updateSettings(request));
    }
}
