package com.camping.duneinsolite.dto.request.publicapi;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
    private String tourSlug;

    @NotNull(message = "Departure date is required")
    private LocalDate date;

    @NotNull(message = "Number of adults is required")
    @Min(value = 1, message = "At least one adult is required")
    private Integer numberOfAdults;

    @Min(value = 0, message = "Number of children cannot be negative")
    private Integer numberOfChildren;

    // Extra add-on activities (ACTIVITY-category Extra slugs), same
    // convention as PublicStayBookingRequest.rideSlugs.
    private List<String> rideSlugs;

    @jakarta.validation.constraints.Pattern(
            regexp = "OWN_VEHICLE|TRANSPORT",
            message = "Arrival mode must be OWN_VEHICLE or TRANSPORT")
    private String arrivalMode;

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
