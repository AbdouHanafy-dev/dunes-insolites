package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.publicapi.PublicActivityBookingRequest;
import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.dto.request.publicapi.PublicTourBookingRequest;
import com.camping.duneinsolite.dto.response.publicapi.PublicBookingResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicStayBookingResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicTourBookingResponse;

/**
 * Guest checkout for the vitrine (DI-013) - no login step. Finds or creates
 * a CLIENT account by email, then creates a real Reservation through the
 * same ReservationService the authenticated admin/client controller path
 * uses. See docs/adr or the DI-013 plan for the full design rationale.
 */
public interface PublicBookingService {
    PublicBookingResponse createActivityBooking(PublicActivityBookingRequest request);
    PublicStayBookingResponse createStayBooking(PublicStayBookingRequest request);
    PublicTourBookingResponse createTourBooking(PublicTourBookingRequest request);
}
