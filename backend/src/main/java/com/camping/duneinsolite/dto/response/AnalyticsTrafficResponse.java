package com.camping.duneinsolite.dto.response;

import java.util.List;

/** Real GA4 traffic for the last 28 days — see GoogleAnalyticsReportingService. */
public record AnalyticsTrafficResponse(
        boolean ok,
        String error,
        int totalSessions,
        int totalPageViews,
        int totalUsers,
        List<DailyPoint> daily
) {
    public record DailyPoint(String date, int sessions, int pageViews, int users) {
    }
}
