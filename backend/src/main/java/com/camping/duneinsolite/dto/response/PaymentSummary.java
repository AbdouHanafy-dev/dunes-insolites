package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.PaymentStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentSummary {

    // ── Original amounts (from reservation at booking time) ───────
    private java.math.BigDecimal originalMainAmount;
    private java.math.BigDecimal originalExtrasAmount;  // totalExtrasAmount
    private java.math.BigDecimal originalTotalAmount;

    // ── What has been paid so far (sum of all COMPLETED transactions) ──
    private java.math.BigDecimal totalPaid;

    // ── What remains after allocation ─────────────────────────────
    // Allocation rule:
    //   payment covers mainAmount first → overflow goes to extrasAmount
    private java.math.BigDecimal remainingMainAmount;
    private java.math.BigDecimal remainingExtrasAmount;
    private java.math.BigDecimal remainingTotal;

    // ── Current payment status ────────────────────────────────────
    // UNPAID         → totalPaid == 0
    // PARTIALLY_PAID → 0 < totalPaid < originalTotalAmount
    // PAID           → totalPaid >= originalTotalAmount
    private PaymentStatus paymentStatus;
}