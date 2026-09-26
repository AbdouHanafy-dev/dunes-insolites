package com.camping.duneinsolite.service;

/**
 * A circuit's duration is stored as whole hours. This is the one place that
 * turns it into days + hours, so the "does it sleep over" rule and the French
 * label cannot drift apart.
 */
public final class TourDuration {

    public static final int MIN_HOURS = 1;
    public static final int MAX_HOURS = 744;

    private TourDuration() {}

    /** A circuit longer than 24 h crosses a night (24 h itself is a single day). */
    public static boolean isMultiDay(Integer hours) {
        return hours != null && hours > 24;
    }

    /**
     * How many nights a circuit crosses: its days minus one (48 h = 1, 72 h = 2). Zero for a single-day
     * circuit, or when the duration is not set.
     */
    public static int nights(Integer hours) {
        if (hours == null || hours <= 24) return 0;
        return (int) Math.ceil(hours / 24.0) - 1;
    }

    /** 26 -> "1 jour et 2 h (26 h)", 48 -> "2 jours (48 h)", 6 -> "6 h". Null when unset. */
    public static String label(Integer hours) {
        if (hours == null) return null;
        int days = hours / 24;
        int rest = hours % 24;
        if (days == 0) return hours + " h";
        String d = days + (days > 1 ? " jours" : " jour");
        return (rest == 0 ? d : d + " et " + rest + " h") + " (" + hours + " h)";
    }
}
