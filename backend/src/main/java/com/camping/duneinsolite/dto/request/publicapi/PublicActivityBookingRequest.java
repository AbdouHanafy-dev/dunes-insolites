package com.camping.duneinsolite.dto.request.publicapi;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

/**
 * POST /api/public/bookings. Field-for-field match of packages/api-types'
 * BookingInput. No account/login involved - see PublicBookingServiceImpl for
 * how this becomes a real Reservation.
 */
@Data
public class PublicActivityBookingRequest {

    @NotBlank(message = "Activity is required")
    private String activitySlug;

    @NotNull(message = "Date is required")
    private LocalDate date;

    // No backend concept of a time slot (the camp confirms the hour on
    // arrival) - carried through into the reservation's notes for staff.
    private String timeSlot;

    @NotNull(message = "Party size is required")
    @Min(value = 1, message = "Party size must be at least 1")
    private Integer partySize;

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    private String email;

    @NotBlank(message = "Phone is required")
    private String phone;

    private String notes;
}
