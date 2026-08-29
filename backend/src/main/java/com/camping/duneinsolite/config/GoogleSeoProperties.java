package com.camping.duneinsolite.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * GA4 + Search Console credentials for the admin "Analytics & Search
 * Console" dashboard (/seo/analytics) - see docs/seo-analytics-setup.md
 * for the one-time Google Cloud setup this reads the result of. Every
 * field defaults empty, which is the normal, expected state until that
 * setup is done - SeoAnalyticsController reports "not configured" rather
 * than erroring, and nothing that actually calls a Google API exists yet
 * (there's nothing to call it with). Add the real client calls here, and
 * only here, once a real service account key exists - never hardcode a
 * key path or property ID anywhere else in this codebase.
 */
@Component
@Getter
public class GoogleSeoProperties {

    @Value("${google.analytics.property-id:}")
    private String analyticsPropertyId;

    @Value("${google.search-console.site-url:}")
    private String searchConsoleSiteUrl;

    @Value("${google.service-account-key-path:}")
    private String serviceAccountKeyPath;

    public boolean isAnalyticsConfigured() {
        return !analyticsPropertyId.isBlank() && !serviceAccountKeyPath.isBlank();
    }

    public boolean isSearchConsoleConfigured() {
        return !searchConsoleSiteUrl.isBlank() && !serviceAccountKeyPath.isBlank();
    }
}
