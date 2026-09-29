package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.AvailabilityBlockRequest;
import com.camping.duneinsolite.dto.request.ExternalAccommodationBookingRequest;
import com.camping.duneinsolite.dto.response.AvailabilityBlockResponse;
import com.camping.duneinsolite.dto.response.AvailabilityDayResponse;
import com.camping.duneinsolite.dto.response.ExternalAccommodationBookingResponse;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

public interface AvailabilityService {

    /** One entry per day of the given month, real reservation counts merged with any manual block. */
    List<AvailabilityDayResponse> getCalendar(UUID tourTypeId, YearMonth month);

    AvailabilityBlockResponse createBlock(AvailabilityBlockRequest request);

    void deleteBlock(UUID blockId);

    ExternalAccommodationBookingResponse createExternalBooking(ExternalAccommodationBookingRequest request);

    void deleteExternalBooking(UUID bookingId);
}
