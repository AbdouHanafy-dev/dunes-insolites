package com.camping.duneinsolite.service;


import com.camping.duneinsolite.dto.request.ReservationExtraRequest;
import com.camping.duneinsolite.dto.response.ReservationExtraResponse;
import com.camping.duneinsolite.dto.response.ReservationExtrasListResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ReservationExtraService {
    ReservationExtraResponse createExtra(ReservationExtraRequest request);
    ReservationExtraResponse getExtraById(UUID extraId);
    Page<ReservationExtraResponse> getAllExtras(Pageable pageable);
    ReservationExtrasListResponse getExtrasByReservation(UUID reservationId);
    List<ReservationExtraResponse> getActiveExtras();
    ReservationExtraResponse updateExtra(UUID extraId, ReservationExtraRequest request);
    void deleteExtra(UUID extraId);
}