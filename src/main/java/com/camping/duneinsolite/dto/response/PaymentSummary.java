package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.PaymentStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentSummary {

    // ── Original amounts (from reservation at booking time) ───────
    private Double originalMainAmount;    // totalAmount (tours or tourTypes)
    private Double originalExtrasAmount;  // totalExtrasAmount
    private Double originalTotalAmount;   // sum of both — grand total to pay

    // ── What has been paid so far (sum of all COMPLETED transactions) ──
    private Double totalPaid;

    // ── What remains after allocation ─────────────────────────────
    // Allocation rule:
    //   payment covers mainAmount first → overflow goes to extrasAmount
    private Double remainingMainAmount;
    private Double remainingExtrasAmount;
    private Double remainingTotal;        // remainingMain + remainingExtras

    // ── Current payment status ────────────────────────────────────
    // UNPAID         → totalPaid == 0
    // PARTIALLY_PAID → 0 < totalPaid < originalTotalAmount
    // PAID           → totalPaid >= originalTotalAmount
    private PaymentStatus paymentStatus;
}