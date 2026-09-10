package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.PaymentRequest;
import com.camping.duneinsolite.dto.response.PaymentResponse;
import com.camping.duneinsolite.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // ── POST /api/reservations/{reservationId}/payments ───────────
    // STAFF ONLY. This records a payment straight into the ledger as a
    // COMPLETED transaction (see PaymentServiceImpl.buildTransaction) — i.e.
    // "an admin logged a bank transfer / cash". A customer must NEVER be able
    // to call it: before this fix, CLIENT/PARTENAIRE could POST a payment
    // against their own reservation and mark it PAID with no money moving
    // (financial-integrity hole — security assessment 2026-09-10, finding P-1).
    //
    // Online payment (Q3, not built) will land here via a provider WEBHOOK
    // verified server-side — the customer's browser never records a payment.
    @PostMapping("/{reservationId}/payments")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<PaymentResponse> recordPayment(
            @PathVariable UUID reservationId,
            @Valid @RequestBody PaymentRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(paymentService.recordPayment(reservationId, request));
    }
}