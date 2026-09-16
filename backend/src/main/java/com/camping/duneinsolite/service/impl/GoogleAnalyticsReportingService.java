package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.config.GoogleSeoProperties;
import com.camping.duneinsolite.dto.response.SearchConsoleQueriesResponse;
import com.camping.duneinsolite.dto.response.AnalyticsTrafficResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.auth.oauth2.GoogleCredentials;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import java.io.FileInputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The real GA4 + Search Console calls docs/seo-analytics-setup.md's guide
 * was written to unlock (see SeoAnalyticsController's own comment, and
 * GoogleSeoProperties'). Read-only ("analytics.readonly" /
 * "webmasters.readonly" scopes) - this dashboard only ever displays real
 * numbers, never a fabricated one; a failed call reports its own error
 * rather than showing a fake report.
 *
 * Plain REST calls signed with the service-account credentials (via
 * google-auth-library-oauth2-http, just the auth piece) instead of the
 * full, gRPC-heavy google-cloud-analytics-data client - two read-only
 * report endpoints don't justify that dependency weight.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleAnalyticsReportingService {

    private static final List<String> ANALYTICS_SCOPES =
            List.of("https://www.googleapis.com/auth/analytics.readonly");
    private static final List<String> SEARCH_CONSOLE_SCOPES =
            List.of("https://www.googleapis.com/auth/webmasters.readonly");
    private static final int WINDOW_DAYS = 28;

    private final GoogleSeoProperties properties;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // One GoogleCredentials instance per scope set, reused across calls -
    // refreshIfExpired() below handles the actual token refresh, so this
    // is just avoiding re-reading the key file off disk every request.
    private GoogleCredentials analyticsCredentials;
    private GoogleCredentials searchConsoleCredentials;

    public AnalyticsTrafficResponse fetchTraffic() {
        if (!properties.isAnalyticsConfigured()) {
            return new AnalyticsTrafficResponse(false, "Non configuré.", 0, 0, 0, List.of());
        }
        try {
            String token = accessToken(true);
            URI uri = URI.create("https://analyticsdata.googleapis.com/v1beta/properties/"
                    + properties.getAnalyticsPropertyId() + ":runReport");
            Map<String, Object> body = Map.of(
                    "dateRanges", List.of(Map.of("startDate", WINDOW_DAYS + "daysAgo", "endDate", "today")),
                    "dimensions", List.of(Map.of("name", "date")),
                    "metrics", List.of(
                            Map.of("name", "sessions"),
                            Map.of("name", "screenPageViews"),
                            Map.of("name", "activeUsers")),
                    "orderBys", List.of(Map.of("dimension", Map.of("dimensionName", "date"))));

            JsonNode result = post(uri, token, body);
            List<AnalyticsTrafficResponse.DailyPoint> daily = new ArrayList<>();
            int totalSessions = 0, totalPageViews = 0, totalUsers = 0;
            for (JsonNode row : result.path("rows")) {
                String date = row.path("dimensionValues").path(0).path("value").asText();
                int sessions = row.path("metricValues").path(0).path("value").asInt();
                int pageViews = row.path("metricValues").path(1).path("value").asInt();
                int users = row.path("metricValues").path(2).path("value").asInt();
                daily.add(new AnalyticsTrafficResponse.DailyPoint(date, sessions, pageViews, users));
                totalSessions += sessions;
                totalPageViews += pageViews;
                totalUsers += users;
            }
            return new AnalyticsTrafficResponse(true, null, totalSessions, totalPageViews, totalUsers, daily);
        } catch (Exception e) {
            log.warn("GA4 report fetch failed: {}", e.getMessage());
            return new AnalyticsTrafficResponse(false, "Erreur lors de la récupération : " + e.getMessage(), 0, 0, 0, List.of());
        }
    }

    public SearchConsoleQueriesResponse fetchTopQueries() {
        if (!properties.isSearchConsoleConfigured()) {
            return new SearchConsoleQueriesResponse(false, "Non configuré.", List.of());
        }
        try {
            String token = accessToken(false);
            String encodedSite = UriUtils.encode(properties.getSearchConsoleSiteUrl(), StandardCharsets.UTF_8);
            URI uri = URI.create(
                    "https://www.googleapis.com/webmasters/v3/sites/" + encodedSite + "/searchAnalytics/query");
            LocalDate end = LocalDate.now();
            LocalDate start = end.minusDays(WINDOW_DAYS);
            Map<String, Object> body = Map.of(
                    "startDate", start.toString(),
                    "endDate", end.toString(),
                    "dimensions", List.of("query"),
                    "rowLimit", 10);

            JsonNode result = post(uri, token, body);
            List<SearchConsoleQueriesResponse.QueryRow> rows = new ArrayList<>();
            for (JsonNode row : result.path("rows")) {
                rows.add(new SearchConsoleQueriesResponse.QueryRow(
                        row.path("keys").path(0).asText(),
                        row.path("clicks").asLong(),
                        row.path("impressions").asLong(),
                        row.path("ctr").asDouble(),
                        row.path("position").asDouble()));
            }
            return new SearchConsoleQueriesResponse(true, null, rows);
        } catch (Exception e) {
            log.warn("Search Console report fetch failed: {}", e.getMessage());
            return new SearchConsoleQueriesResponse(false, "Erreur lors de la récupération : " + e.getMessage(), List.of());
        }
    }

    // Reads the response as a plain String and parses it with our own
    // ObjectMapper, rather than asking RestTemplate's message-converter
    // chain to build a JsonNode directly - that path failed with a
    // Jackson "Type definition error" against JsonNode's abstract type
    // for both Google endpoints below. A URI (not a String) is required
    // too: RestTemplate.exchange(String, ...) re-parses/re-encodes the
    // URL via UriComponentsBuilder, which mangled the already-percent-
    // encoded Search Console site URL.
    private JsonNode post(URI uri, String accessToken, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        String raw = restTemplate.exchange(uri, HttpMethod.POST, new HttpEntity<>(body, headers), String.class).getBody();
        try {
            return objectMapper.readTree(raw);
        } catch (IOException e) {
            throw new IllegalStateException("Invalid JSON response from " + uri + ": " + raw, e);
        }
    }

    private synchronized String accessToken(boolean analytics) throws IOException {
        if (analytics) {
            if (analyticsCredentials == null) {
                analyticsCredentials = loadCredentials(ANALYTICS_SCOPES);
            }
            analyticsCredentials.refreshIfExpired();
            return analyticsCredentials.getAccessToken().getTokenValue();
        } else {
            if (searchConsoleCredentials == null) {
                searchConsoleCredentials = loadCredentials(SEARCH_CONSOLE_SCOPES);
            }
            searchConsoleCredentials.refreshIfExpired();
            return searchConsoleCredentials.getAccessToken().getTokenValue();
        }
    }

    private GoogleCredentials loadCredentials(List<String> scopes) throws IOException {
        try (FileInputStream in = new FileInputStream(properties.getServiceAccountKeyPath())) {
            return GoogleCredentials.fromStream(in).createScoped(scopes);
        }
    }
}
