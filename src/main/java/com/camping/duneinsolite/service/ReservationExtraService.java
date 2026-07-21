package com.camping.duneinsolite.service;


import com.camping.duneinsolite.dto.request.ReservationExtraRequest;
import com.camping.duneinsolite.dto.response.ReservationExtraResponse;
import com.camping.duneinsolite.dto.response.ReservationExtrasListResponse;

import java.util.List;
import java.util.UUID;

public interface ReservationExtraService {
    ReservationExtraResponse createExtra(ReservationExtraRequest request);
    ReservationExtraResponse getExtraById(UUID extraId);
    List<ReservationExtraResponse> getAllExtras();
    ReservationExtrasListResponse getExtrasByReservation(UUID reservationId);
    List<ReservationExtraResponse> getActiveExtras();
    ReservationExtraResponse updateExtra(UUID extraId, ReservationExtraRequest request);
    void deleteExtra(UUID extraId);
}