package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.InvalidPickupCitiesException;
import com.camping.duneinsolite.model.enums.DepartureCity;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;

/**
 * Which departure / return cities a circuit or camp stay offers. Editors tick them
 * in the backoffice; the booking flows show only those, and the server refuses any
 * other. An omitted list means "unchanged" on update and "all cities" on create.
 */
public final class PickupCities {

    private PickupCities() {}

    public static Set<DepartureCity> all() {
        return EnumSet.allOf(DepartureCity.class);
    }

    /** Enum names in declaration order, for the public wire format. */
    public static java.util.List<String> names(Set<DepartureCity> cities) {
        if (cities == null) return java.util.List.of();
        return java.util.Arrays.stream(DepartureCity.values()).filter(cities::contains).map(Enum::name).toList();
    }

    /** Departure needs at least one ticked city, or the booking step would have nothing to offer. */
    public static Set<DepartureCity> departureForSave(Set<DepartureCity> requested, Set<DepartureCity> previous) {
        if (requested == null) return previous != null ? new HashSet<>(previous) : all();
        if (requested.isEmpty()) {
            throw new InvalidPickupCitiesException("Tick at least one departure city.");
        }
        return new HashSet<>(requested);
    }

    /** Return is optional for the guest, so an empty selection simply hides that step. */
    public static Set<DepartureCity> returnForSave(Set<DepartureCity> requested, Set<DepartureCity> previous) {
        if (requested == null) return previous != null ? new HashSet<>(previous) : all();
        return new HashSet<>(requested);
    }

    /** {@code chosen} is the raw enum name from the request; null means the guest skipped it. */
    public static void requireOffered(String field, String chosen, Set<DepartureCity> offered) {
        if (chosen == null || chosen.isBlank()) return;
        // A product saved before cities existed has none ticked, and the site then offers every city
        // for departure (lib/cities.ts); refusing the very city the site offered would block the booking.
        if ("departure".equals(field) && (offered == null || offered.isEmpty())) return;
        boolean ok = offered != null && offered.stream().anyMatch(c -> c.name().equals(chosen));
        if (!ok) {
            throw new InvalidPickupCitiesException("The " + field + " city " + chosen + " is not offered for this product.");
        }
    }
}
