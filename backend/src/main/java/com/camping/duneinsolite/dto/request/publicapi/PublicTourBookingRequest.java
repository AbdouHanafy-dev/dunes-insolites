package com.camping.duneinsolite.dto.request.publicapi;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

/**
 * POST /api/public/tour-bookings. No account/login involved — see
 * PublicBookingServiceImpl for how this becomes a real TOURS-type
 * Reservation, reusing the exact same ReservationService path the admin's
 * "Nouvelle réservation" form uses for Tours.
 */
@Data
public class PublicTourBookingRequest {

    @NotBlank(message = "Tour is required")
    private String tourSlug;

    @NotNull(message = "Departure date is required")
    private LocalDate date;

    @NotNull(message = "Number of adults is required")
    @Min(value = 1, message = "At least one adult is required")
    private Integer numberOfAdults;

    @Min(value = 0, message = "Number of children cannot be negative")
    private Integer numberOfChildren;

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    private String email;

    @NotBlank(message = "Phone is required")
    private String phone;

    private String notes;

    // Optional idempotency key — one UUID per booking attempt, re-used on a
    // network retry so the retry returns the same reservation. See V7.
    private String idempotencyKey;
}
