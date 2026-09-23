package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.PaymentRequestSendRequest;
import com.camping.duneinsolite.dto.response.PaymentRequestResult;
import com.camping.duneinsolite.service.impl.PaymentRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Staff sets what a client is asked to pay, and sends (or resends) the payment
 * email. Lives in its own controller rather than ReservationController so the
 * money path there stays untouched.
 */
@RestController
@RequestMapping("/api/reservations/{reservationId}")
@RequiredArgsConstructor
public class PaymentRequestController {

    private final PaymentRequestService paymentRequestService;

    /** Save the link/amount and email the client now. */
    @PostMapping("/payment-request")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<PaymentRequestResult> send(
            @PathVariable UUID reservationId,
            @Valid @RequestBody(required = false) PaymentRequestSendRequest request) {
        PaymentRequestSendRequest r = request != null ? request : new PaymentRequestSendRequest();
        return ResponseEntity.ok(paymentRequestService.send(reservationId, r.getPaymentLink(), r.getAmount()));
    }

    /**
     * Save the link/amount without emailing - the confirm step stores them and
     * then confirms the reservation, which sends the one confirmation email.
     */
    @PutMapping("/payment-terms")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<Void> saveTerms(
            @PathVariable UUID reservationId,
            @Valid @RequestBody PaymentRequestSendRequest request) {
        paymentRequestService.saveTerms(reservationId, request.getPaymentLink(), request.getAmount());
        return ResponseEntity.noContent().build();
    }
}
