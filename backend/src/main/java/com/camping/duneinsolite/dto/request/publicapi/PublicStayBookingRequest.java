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

    // Accommodation tiers chosen for this booking, each with its own
    // quantity — a guest may pick several at once (e.g. 2 Suites + 3
    // Tentes together). Absent/empty = no tier chosen (bivouac). The
    // server re-resolves and snapshots each tier's price; nothing here is
    // trusted as a price.
    @Valid
    private List<PublicAccommodationSelectionRequest> accommodations;

    @NotNull(message = "Date is required")
    @FutureOrPresent(message = "Date cannot be in the past")
    private LocalDate date;

    // How many nights this booking covers, computed client-side from the
    // guest's arrival/departure picks. Null/omitted = 1 (a fixed
    // single-night stay only ever asks for the arrival date). Validated
    // against the stay's own TourType.maxNights in the service.
    @Min(value = 1, message = "Nights must be at least 1")
    private Integer nights;

    @NotNull(message = "Party size is required")
    @Min(value = 1, message = "Party size must be at least 1")
    @Max(value = 12, message = "Party size cannot exceed 12")
    private Integer partySize;

    // How many of partySize are children (priced at the stay's child rate).
    // Null/omitted = 0, so existing callers keep pricing everyone as adults.
    // At least one adult must remain.
    @Min(value = 0, message = "Children cannot be negative")
    private Integer children;

    // Infants (0-3), on top of partySize (not part of it). Free until priced in the back office.
    @Min(value = 0, message = "Infants cannot be negative")
    @Max(value = 6, message = "Infants cannot exceed 6")
    private Integer infants;

    private List<String> rideSlugs;

    // Minutes chosen per timed activity, keyed by activity slug (the main
    // activity and any add-on rides). Absent = the activity's base duration.
    // The server validates each against the back-office base/step/max.
    private java.util.Map<@Size(max = 120) String, @Min(1) Integer> activityDurations;

    @jakarta.validation.constraints.Pattern(
            regexp = "OWN_VEHICLE|TRANSPORT",
            message = "Arrival mode must be OWN_VEHICLE or TRANSPORT")
    private String arrivalMode;

    @jakarta.validation.constraints.Pattern(
            regexp = "TUNIS|SOUSSE|HAMMAMET|DJERBA|MAHDIA|MONASTIR|TOZEUR",
            message = "Departure city must be one of TUNIS, SOUSSE, HAMMAMET, DJERBA, MAHDIA, MONASTIR, TOZEUR")
    private String departureCity;

    // Optional return leg after the stay - same city catalog as
    // departureCity. The guest may skip it; staff arrange the driver later.
    @jakarta.validation.constraints.Pattern(
            regexp = "TUNIS|SOUSSE|HAMMAMET|DJERBA|MAHDIA|MONASTIR|TOZEUR",
            message = "Return city must be one of TUNIS, SOUSSE, HAMMAMET, DJERBA, MAHDIA, MONASTIR, TOZEUR")
    private String returnCity;

    // A return city that is not in the list, typed by the guest. Exclusive with returnCity; charged
    // through the back-office "another return city" option when one is set up.
    @jakarta.validation.constraints.Size(max = 120)
    private String returnCityOther;

    // Optional, TRANSPORT only: where the guest would like to be met. Support
    // sees and edits it in the backoffice; it is never echoed back to guests.
    @jakarta.validation.constraints.Size(max = 255)
    private String meetUpPlace;

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

    // The site language the guest is browsing in ("fr", "en", "de", "it", "da", "ar"); their booking emails follow it.
    @Size(max = 10)
    private String locale;
}
