package com.camping.duneinsolite.dto.request.publicapi;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * POST /api/public/bookings. Field-for-field match of packages/api-types'
 * BookingInput. No account/login involved - see PublicBookingServiceImpl for
 * how this becomes a real Reservation.
 *
 * Gained the same "Getting There & Guide" + extras fields
 * PublicTourBookingRequest/PublicStayBookingRequest already have (21 Sep
 * 2026) — a standalone activity booked via /book (not from an on-site guest
 * already at the camp) may still need pickup/transport, same as a day
 * circuit. See PublicBookingServiceImpl#createActivityBooking.
 */
@Data
public class PublicActivityBookingRequest {

    @NotBlank(message = "Activity is required")
    @Size(max = 120)
    private String activitySlug;

    @NotNull(message = "Date is required")
    @FutureOrPresent(message = "Date cannot be in the past")
    private LocalDate date;

    // No backend concept of a time slot (the camp confirms the hour on
    // arrival) - carried through into the reservation's notes for staff.
    private String timeSlot;

    // Same adults/children split as PublicTourBookingRequest, for the same
    // reason: one consistent booking shape across the site, even though
    // Extra pricing (unlike TourType) doesn't differentiate by age -
    // unitPrice is flat per head. Kept for headcount/logistics accuracy,
    // not because the total changes.
    @NotNull(message = "Number of adults is required")
    @Min(value = 1, message = "At least one adult is required")
    @Max(value = 12, message = "Number of adults cannot exceed 12")
    private Integer numberOfAdults;

    @Min(value = 0, message = "Number of children cannot be negative")
    @Max(value = 11, message = "Number of children cannot exceed 11")
    private Integer numberOfChildren;

    // Extra add-on activities (other ACTIVITY-category Extra slugs), same
    // convention as PublicTourBookingRequest.rideSlugs.
    private List<String> rideSlugs;

    @jakarta.validation.constraints.Pattern(
            regexp = "OWN_VEHICLE|TRANSPORT",
            message = "Arrival mode must be OWN_VEHICLE or TRANSPORT")
    private String arrivalMode;

    @jakarta.validation.constraints.Pattern(
            regexp = "TUNIS|SOUSSE|HAMMAMET|DJERBA|MAHDIA|MONASTIR",
            message = "Departure city must be one of TUNIS, SOUSSE, HAMMAMET, DJERBA, MAHDIA, MONASTIR")
    private String departureCity;

    // Optional return leg after the activity - same city catalog as
    // departureCity. The guest may skip it; staff arrange the driver later.
    @jakarta.validation.constraints.Pattern(
            regexp = "TUNIS|SOUSSE|HAMMAMET|DJERBA|MAHDIA|MONASTIR",
            message = "Return city must be one of TUNIS, SOUSSE, HAMMAMET, DJERBA, MAHDIA, MONASTIR")
    private String returnCity;

    // The guest's preferred language(s), from the admin-managed catalog, so
    // staff can assign an instructor/guide who speaks one. Same convention
    // as PublicTourBookingRequest.
    private List<String> preferredLanguageIds;
    private String otherLanguageRequested;

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
