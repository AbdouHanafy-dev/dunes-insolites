package com.camping.duneinsolite.dto.response.publicapi;

import java.time.LocalDate;

/**
 * Truthful activity availability for one day. One activity is one resource
 * (unlike a stay's several accommodation tiers), so this is flat rather than
 * a list - status per activity: AVAILABLE / UNAVAILABLE / UNKNOWN (UNKNOWN =
 * no unit inventory configured yet).
 */
public record PublicActivityAvailabilityResponse(
        String activitySlug,
        LocalDate date,
        String status,
        Integer unitsAvailable,
        Integer maxUnits
) {}
