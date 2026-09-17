package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * The pickup information a TRANSPORT-category {@link Extra}
 * requires - only the fields relevant to the chosen option's type are
 * expected to be filled in (hotel name for a hotel pickup, flight number
 * for an airport pickup); nothing here is itself required unless the
 * option's {@code requiresPickupLocation} is true, enforced in
 * {@code ReservationServiceImpl}, not by a NOT NULL column, since which
 * fields matter depends on the option picked.
 */
@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PickupDetails {

    @Column(name = "pickup_hotel_name")
    private String hotelName;

    @Column(name = "pickup_airport")
    private String airport;

    @Column(name = "pickup_flight_number")
    private String flightNumber;

    @Column(name = "pickup_address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "pickup_arrival_time")
    private String arrivalTime;

    @Column(name = "pickup_instructions", columnDefinition = "TEXT")
    private String instructions;

    /** Whether the guest supplied at least one piece of pickup information. */
    @Transient
    public boolean isBlank() {
        return isBlank(hotelName) && isBlank(airport) && isBlank(flightNumber)
                && isBlank(address) && isBlank(arrivalTime) && isBlank(instructions);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
