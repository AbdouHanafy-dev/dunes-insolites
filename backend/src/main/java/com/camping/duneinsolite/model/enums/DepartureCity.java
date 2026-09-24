package com.camping.duneinsolite.model.enums;

/**
 * Where the guest is departing from, for a reservation that involves pickup
 * (TOURS, HEBERGEMENT). Not meaningful for a standalone EXTRAS booking — the
 * camp confirms the activity hour on arrival, no pickup routing involved.
 * Shared by both public booking request DTOs and the Reservation entity
 * itself, same single-definition convention as {@link ArrivalMode}.
 */
public enum DepartureCity {
    TUNIS,
    SOUSSE,
    HAMMAMET,
    DJERBA,
    MAHDIA,
    MONASTIR,
    TOZEUR
}
