package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.ExternalAccommodationBooking;
import com.camping.duneinsolite.model.enums.ExternalBookingSource;

import java.time.LocalDate;
import java.util.UUID;

public record ExternalAccommodationBookingResponse(
        UUID id,
        UUID accommodationTypeId,
        String accommodationName,
        LocalDate checkIn,
        LocalDate checkOut,
        int units,
        ExternalBookingSource source,
        String externalReference,
        String note
) {
    public static ExternalAccommodationBookingResponse from(ExternalAccommodationBooking booking) {
        return new ExternalAccommodationBookingResponse(
                booking.getId(), booking.getAccommodationType().getId(),
                booking.getAccommodationType().getName(), booking.getCheckIn(), booking.getCheckOut(),
                booking.getUnits(), booking.getSource(), booking.getExternalReference(), booking.getNote());
    }
}
