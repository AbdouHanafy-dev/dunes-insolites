package com.camping.duneinsolite.mapper.publicapi;

import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.enums.GroupSizeType;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Derives the marketing-copy fields packages/api-types' Activity/Stay types
 * require but Extra/TourType don't store (kicker, tagline, longDescription,
 * duration in minutes, group size as a display string). Shared by
 * PublicActivityMapper and PublicStayMapper.
 *
 * Deliberately plain Java rather than MapStruct: every field here needs real
 * derivation logic (regex parsing, sentence splitting), which MapStruct's
 * expression/qualifiedByName machinery makes harder to read than it would be
 * to just write, for no benefit over the straightforward 1:1 mapping
 * MapStruct is used for elsewhere in this codebase.
 */
final class PublicCatalogText {

    private static final Pattern HOURS_MINUTES = Pattern.compile("(\\d+)\\s*h\\s*(\\d+)?");
    private static final Pattern MINUTES_ONLY = Pattern.compile("(\\d+)\\s*min");

    private PublicCatalogText() {
    }

    static String kicker(String location) {
        return (location == null || location.isBlank()) ? "Dunes Insolites" : location;
    }

    static String tagline(String description) {
        if (description == null || description.isBlank()) return "";
        int end = description.indexOf(". ");
        return end > 0 ? description.substring(0, end + 1) : description;
    }

    static List<String> longDescription(String aboutText) {
        return (aboutText == null || aboutText.isBlank()) ? List.of() : List.of(aboutText);
    }

    static List<String> gallery(List<Photo> photos) {
        return photos == null ? List.of() : photos.stream().map(Photo::getUrl).toList();
    }

    static String groupSize(GroupSizeType type) {
        if (type == null) return "";
        return switch (type) {
            case PETIT_GROUPE -> "Small group";
            case GROUPE_MOYEN -> "Medium group";
            case TOUTES_TAILLES -> "Any group size";
            case PRIVATIF -> "Private";
        };
    }

    /** Parses free-text durations like "1h30", "2h" or "30 minute" into minutes. */
    static int parseDurationMinutes(String duration) {
        if (duration == null || duration.isBlank()) return 0;
        String normalized = duration.toLowerCase();

        Matcher hoursMinutes = HOURS_MINUTES.matcher(normalized);
        if (hoursMinutes.find()) {
            int hours = Integer.parseInt(hoursMinutes.group(1));
            String minutesGroup = hoursMinutes.group(2);
            int minutes = (minutesGroup != null && !minutesGroup.isBlank()) ? Integer.parseInt(minutesGroup) : 0;
            return hours * 60 + minutes;
        }

        Matcher minutesOnly = MINUTES_ONLY.matcher(normalized);
        if (minutesOnly.find()) {
            return Integer.parseInt(minutesOnly.group(1));
        }

        return 0;
    }
}
