package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.TransactionRequest;
import com.camping.duneinsolite.dto.response.TransactionResponse;
import com.camping.duneinsolite.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    // No hard-delete endpoint exists on this controller at all, so unlike
    // Invoices/Reservations there's nothing to exclude here - FULL really
    // does mean the whole surface.
    @PostMapping
    @PreAuthorize("@perm.can('TRANSACTIONS', 'FULL')")
    public ResponseEntity<TransactionResponse> createTransaction(@Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.createTransaction(request));
    }

    @GetMapping("/{transactionId}")
    @PreAuthorize("@perm.can('TRANSACTIONS', 'READ')")
    public ResponseEntity<TransactionResponse> getTransactionById(@PathVariable UUID transactionId) {
        return ResponseEntity.ok(transactionService.getTransactionById(transactionId));
    }

    @GetMapping
    @PreAuthorize("@perm.can('TRANSACTIONS', 'READ')")
    public ResponseEntity<Page<TransactionResponse>> getAllTransactions(@PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(transactionService.getAllTransactions(pageable));
    }

    @GetMapping("/reservation/{reservationId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TransactionResponse>> getByReservation(@PathVariable UUID reservationId) {
        return ResponseEntity.ok(transactionService.getTransactionsByReservation(reservationId));
    }

    @GetMapping("/invoice/{invoiceId}")
    @PreAuthorize("@perm.can('TRANSACTIONS', 'READ')")
    public ResponseEntity<List<TransactionResponse>> getByInvoice(@PathVariable UUID invoiceId) {
        return ResponseEntity.ok(transactionService.getTransactionsByInvoice(invoiceId));
    }
}