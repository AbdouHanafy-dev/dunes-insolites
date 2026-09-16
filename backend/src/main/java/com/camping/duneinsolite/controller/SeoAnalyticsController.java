package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.config.GoogleSeoProperties;
import com.camping.duneinsolite.dto.response.AnalyticsTrafficResponse;
import com.camping.duneinsolite.dto.response.SearchConsoleQueriesResponse;
import com.camping.duneinsolite.dto.response.SeoIntegrationStatusResponse;
import com.camping.duneinsolite.service.impl.GoogleAnalyticsReportingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * See docs/seo-analytics-setup.md for the real Google Cloud setup this
 * waits on (a service account, granted access on the real GA4 and Search
 * Console properties) — now done (15 Sep 2026), so /traffic and
 * /search-queries below call the real analyticsdata.googleapis.com /
 * webmasters.googleapis.com endpoints (GoogleAnalyticsReportingService),
 * not a status check only. The key never reaches the frontend or git.
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
    private final GoogleAnalyticsReportingService reportingService;

    @GetMapping("/status")
    public ResponseEntity<SeoIntegrationStatusResponse> getStatus() {
        return ResponseEntity.ok(new SeoIntegrationStatusResponse(
                googleSeoProperties.isAnalyticsConfigured(),
                googleSeoProperties.isSearchConsoleConfigured()));
    }

    @GetMapping("/traffic")
    public ResponseEntity<AnalyticsTrafficResponse> getTraffic() {
        return ResponseEntity.ok(reportingService.fetchTraffic());
    }

    @GetMapping("/search-queries")
    public ResponseEntity<SearchConsoleQueriesResponse> getSearchQueries() {
        return ResponseEntity.ok(reportingService.fetchTopQueries());
    }
}
