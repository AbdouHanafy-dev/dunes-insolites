package com.camping.duneinsolite.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A promo code with what it brought in. Only confirmed, checked-in and completed reservations count
 * towards the commission; pending ones are shown apart so nothing is owed on a booking that may fall through.
 */
@Data
@Builder
public class PromoCodeResponse {
    private UUID promoCodeId;
    private String code;
    private String partnerName;
    private BigDecimal discountPercent;
    private BigDecimal commissionPercent;
    private LocalDate validFrom;
    private LocalDate validUntil;
    private boolean active;

    /** Confirmed, checked-in or completed reservations. */
    private long reservations;
    /** Reservations still waiting for confirmation. */
    private long pendingReservations;
    /** What the counted reservations pay for their circuits, after the discount. */
    private BigDecimal circuitRevenue;
    /** What the code took off the counted reservations. */
    private BigDecimal discountGiven;
    /** circuitRevenue x commissionPercent; null while no rate is set. */
    private BigDecimal commissionDue;
}
