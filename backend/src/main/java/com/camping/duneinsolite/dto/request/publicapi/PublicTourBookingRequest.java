package com.camping.duneinsolite.dto.request.publicapi;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * POST /api/public/tour-bookings. No account/login involved — see
 * PublicBookingServiceImpl for how this becomes a real TOURS-type
 * Reservation, reusing the exact same ReservationService path the admin's
 * "Nouvelle réservation" form uses for Tours.
 *
 * Gained the same "Getting There & Guide" + extras fields
 * PublicStayBookingRequest already has (19 Sep 2026) — a circuit's price
 * covers the route itself, not the guide/support-vehicle/extra activities
 * a guest layers on top. See PublicBookingServiceImpl#createTourBooking,
 * which now resolves these the same way createStayBooking does.
 */
@Data
public class PublicTourBookingRequest {

    @NotBlank(message = "Tour is required")
    @Size(max = 120)
    private String tourSlug;

    @NotNull(message = "Departure date is required")
    @FutureOrPresent(message = "Departure date cannot be in the past")
    private LocalDate date;

    @NotNull(message = "Number of adults is required")
    @Min(value = 1, message = "At least one adult is required")
    @Max(value = 12, message = "Number of adults cannot exceed 12")
    private Integer numberOfAdults;

    @Min(value = 0, message = "Number of children cannot be negative")
    @Max(value = 11, message = "Number of children cannot exceed 11")
    private Integer numberOfChildren;

    // Extra add-on activities (ACTIVITY-category Extra slugs), same
    // convention as PublicStayBookingRequest.rideSlugs.
    private List<String> rideSlugs;

    // Accommodation tiers from the shared Sabria catalogue. Multi-day
    // circuits require a selection; the same shape is accepted from every
    // circuit detail form and PublicStayBookingRequest.accommodations.
    @Valid
    private List<PublicAccommodationSelectionRequest> accommodations;

    @jakarta.validation.constraints.Pattern(
            regexp = "OWN_VEHICLE|TRANSPORT",
            message = "Arrival mode must be OWN_VEHICLE or TRANSPORT")
    private String arrivalMode;

    @jakarta.validation.constraints.Pattern(
            regexp = "TUNIS|SOUSSE|HAMMAMET|DJERBA|MAHDIA|MONASTIR|TOZEUR",
            message = "Departure city must be one of TUNIS, SOUSSE, HAMMAMET, DJERBA, MAHDIA, MONASTIR, TOZEUR")
    private String departureCity;

    // Optional return leg after the tour - same city catalog as
    // departureCity. The guest may skip it; staff arrange the driver later.
    @jakarta.validation.constraints.Pattern(
            regexp = "TUNIS|SOUSSE|HAMMAMET|DJERBA|MAHDIA|MONASTIR|TOZEUR",
            message = "Return city must be one of TUNIS, SOUSSE, HAMMAMET, DJERBA, MAHDIA, MONASTIR, TOZEUR")
    private String returnCity;

    // Optional, TRANSPORT only: where the guest would like to be met. Support
    // sees and edits it in the backoffice; it is never echoed back to guests.
    @jakarta.validation.constraints.Size(max = 255)
    private String meetUpPlace;

    // The guest's preferred language(s), from the admin-managed catalog
    // (GET /api/public/languages), so staff can assign a Guide who actually
    // speaks one (Guide.languages). A guest may pick several, or none of the
    // above and type otherLanguageRequested instead.
    private List<String> preferredLanguageIds;
    private String otherLanguageRequested;

    // Guide (with support vehicle, or in the guest's own vehicle) and/or
    // transport/pickup, when the guest chose one.
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

    @AssertTrue(message = "Total party size cannot exceed 12")
    @com.fasterxml.jackson.annotation.JsonIgnore
    public boolean isPartySizeValid() {
        return numberOfAdults == null || numberOfChildren == null
                || numberOfAdults + numberOfChildren <= 12;
    }

    // The site language the guest is browsing in ("fr", "en", "de", "it", "da", "ar"); their booking emails follow it.
    @Size(max = 10)
    private String locale;
}
