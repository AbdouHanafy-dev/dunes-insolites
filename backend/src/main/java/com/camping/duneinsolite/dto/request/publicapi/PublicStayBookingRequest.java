package com.camping.duneinsolite.dto.request.publicapi;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * POST /api/public/stay-bookings. Field-for-field match of
 * packages/api-types' StayBookingInput. No account/login involved - see
 * PublicBookingServiceImpl for how this becomes a real Reservation.
 */
@Data
public class PublicStayBookingRequest {

    @NotBlank(message = "Stay is required")
    private String staySlug;

    // Accommodation isn't modeled on TourType yet (see docs/ROADMAP.md
    // DI-012 notes) - carried through into the reservation's notes for
    // staff, does not affect the computed price.
    private String accommodationSlug;
    private Integer accommodationQty;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotNull(message = "Party size is required")
    @Min(value = 1, message = "Party size must be at least 1")
    private Integer partySize;

    private List<String> rideSlugs;

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
