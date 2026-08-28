package com.camping.duneinsolite.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

/**
 * One calendar day for one TourType: the real, already-booked count (from
 * ReservationTourType, non-cancelled/rejected reservations only) alongside
 * whether staff manually marked the day closed. Both facts, side by side -
 * nothing here is a computed "% full", since TourType has no capacity field
 * to divide against (see AvailabilityBlock's own doc comment).
 */
@Data
public class AvailabilityDayResponse {
    private LocalDate date;
    private int reservationCount;
    private int adults;
    private int children;
    private UUID blockId; // null when not manually blocked
    private String blockNote;
}
