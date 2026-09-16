package com.camping.duneinsolite.dto.response;

import java.util.List;

/** Real Search Console top queries for the last 28 days — see GoogleAnalyticsReportingService. */
public record SearchConsoleQueriesResponse(
        boolean ok,
        String error,
        List<QueryRow> topQueries
) {
    public record QueryRow(String query, long clicks, long impressions, double ctr, double position) {
    }
}
