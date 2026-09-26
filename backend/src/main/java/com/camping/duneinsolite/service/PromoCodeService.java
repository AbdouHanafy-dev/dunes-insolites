package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.PromoCodeRequest;
import com.camping.duneinsolite.dto.response.PromoCodeCheckResponse;
import com.camping.duneinsolite.dto.response.PromoCodeResponse;
import com.camping.duneinsolite.model.PromoCode;
import com.camping.duneinsolite.model.enums.ReservationType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromoCodeService {

    /**
     * The code a guest typed for a booking, or empty when none was typed. A code that does not exist, is
     * switched off, is out of its dates, or is used on something other than a circuit is refused.
     */
    Optional<PromoCode> resolveForBooking(String typedCode, ReservationType type);

    /** For the booking form: is this code usable on a circuit today, and for how much off. */
    PromoCodeCheckResponse check(String typedCode);

    List<PromoCodeResponse> listWithStats();

    PromoCodeResponse create(PromoCodeRequest request);

    PromoCodeResponse update(UUID id, PromoCodeRequest request);

    /** Deletes a code no reservation used; a code with bookings can only be switched off. */
    void delete(UUID id);
}
