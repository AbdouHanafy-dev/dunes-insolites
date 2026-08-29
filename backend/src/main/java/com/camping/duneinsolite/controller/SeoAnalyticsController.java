package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.config.GoogleSeoProperties;
import com.camping.duneinsolite.dto.response.SeoIntegrationStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The place, prepared: this is deliberately just a status check today, not
 * a working Analytics/Search Console integration - see
 * docs/seo-analytics-setup.md for the real Google Cloud setup this waits
 * on (a service account, granted access on the real GA4 and Search
 * Console properties). Once that's done and the three env vars in
 * GoogleSeoProperties are set, this is where the real
 * analytics.googleapis.com/webmasters.googleapis.com calls get added -
 * server-side only, the key never reaches the frontend or git.
 *
 * ADMIN-only via the blanket /api/admin/** rule in SecurityConfig, not
 * the CAMPING/PARTENAIRE permission matrix (RolePermission) - deciding
 * who sees real traffic/ranking data isn't something to delegate through
 * the same matrix that governs ordinary CRUD screens.
 */
@RestController
@RequestMapping("/api/admin/seo/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SeoAnalyticsController {

    private final GoogleSeoProperties googleSeoProperties;

    @GetMapping("/status")
    public ResponseEntity<SeoIntegrationStatusResponse> getStatus() {
        return ResponseEntity.ok(new SeoIntegrationStatusResponse(
                googleSeoProperties.isAnalyticsConfigured(),
                googleSeoProperties.isSearchConsoleConfigured()));
    }
}
