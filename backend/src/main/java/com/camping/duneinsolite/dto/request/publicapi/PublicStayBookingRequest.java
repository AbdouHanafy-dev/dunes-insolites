package com.camping.duneinsolite.dto.request.publicapi;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
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
    @Size(max = 120)
    private String staySlug;

    // Accommodation isn't modeled on TourType yet (see docs/ROADMAP.md
    // DI-012 notes) - carried through into the reservation's notes for
    // staff, does not affect the computed price.
    private String accommodationSlug;
    private Integer accommodationQty;

    @NotNull(message = "Date is required")
    @FutureOrPresent(message = "Date cannot be in the past")
    private LocalDate date;

    @NotNull(message = "Party size is required")
    @Min(value = 1, message = "Party size must be at least 1")
    @Max(value = 12, message = "Party size cannot exceed 12")
    private Integer partySize;

    private List<String> rideSlugs;

    @jakarta.validation.constraints.Pattern(
            regexp = "OWN_VEHICLE|TRANSPORT",
            message = "Arrival mode must be OWN_VEHICLE or TRANSPORT")
    private String arrivalMode;

    // "Getting There & Guide" step - guide (with support vehicle, or in the
    // guest's own vehicle) and/or transport/pickup, when the tour needs one
    // or the guest chose one.
    @Valid
    private List<PublicServiceOptionSelectionRequest> serviceOptions;

    @NotBlank(message = "Name is required")
    @Size(max = 120)
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    @Size(max = 254)
    private String email;

    @NotBlank(message = "Phone is required")
    @Size(max = 40)
    private String phone;

    @Size(max = 2000)
    private String notes;

    // Optional idempotency key — one UUID per booking attempt, re-used on a
    // network retry so the retry returns the same reservation. See V7.
    @NotBlank(message = "Idempotency key is required")
    @Pattern(regexp = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
            message = "Idempotency key must be a UUID")
    private String idempotencyKey;

    @NotNull(message = "Terms acceptance is required")
    @AssertTrue(message = "Terms and privacy policy must be accepted")
    private Boolean acceptedTerms;
}
