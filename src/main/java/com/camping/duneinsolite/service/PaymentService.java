package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.PaymentRequest;
import com.camping.duneinsolite.dto.response.PaymentResponse;
import com.camping.duneinsolite.dto.response.PaymentSummary;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.Transaction;

import java.util.UUID;

public interface PaymentService {

    // ── Standalone payment endpoint ───────────────────────────────
    // Called from POST /api/reservations/{id}/payments
    // Creates a Transaction and returns updated payment state
    PaymentResponse recordPayment(UUID reservationId, PaymentRequest request);

    // ── Compute current payment summary from all transactions ─────
    // Called after every reservation read to inject into ReservationResponse
    // Pure computation — no DB writes
    PaymentSummary computePaymentSummary(Reservation reservation);

    Transaction buildTransaction(Reservation reservation, PaymentRequest request);
    void publishPaymentReceivedInternal(Reservation reservation, Double amount);
    void publishPaymentCompletedInternal(Reservation reservation);
}
