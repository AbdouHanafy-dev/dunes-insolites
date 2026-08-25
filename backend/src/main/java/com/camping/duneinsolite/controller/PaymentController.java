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
    // All roles can record a payment:
    //   ADMIN, CAMPING  → can pay on behalf of anyone at any status
    //   CLIENT, PARTENAIRE → can pay for their own reservation
    //
    // Note: ownership check is done in PaymentServiceImpl
    // Note: this endpoint is separate from updateReservation intentionally
    //       → single responsibility, clean notifications, Stripe-ready
    @PostMapping("/{reservationId}/payments")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING', 'CLIENT', 'PARTENAIRE')")
    public ResponseEntity<PaymentResponse> recordPayment(
            @PathVariable UUID reservationId,
            @Valid @RequestBody PaymentRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(paymentService.recordPayment(reservationId, request));
    }
}