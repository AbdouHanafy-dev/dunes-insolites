package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.InvoiceRequest;
import com.camping.duneinsolite.dto.response.InvoiceResponse;
import com.camping.duneinsolite.service.InvoiceService;
import com.camping.duneinsolite.service.impl.InvoiceEmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService      invoiceService;
    private final InvoiceEmailService invoiceEmailService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<InvoiceResponse> createInvoice(@Valid @RequestBody InvoiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.createInvoice(request));
    }

    @GetMapping("/{invoiceId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<InvoiceResponse> getInvoiceById(@PathVariable UUID invoiceId) {
        return ResponseEntity.ok(invoiceService.getInvoiceById(invoiceId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<List<InvoiceResponse>> getAllInvoices(
            @RequestParam(defaultValue = "number") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(invoiceService.getAllInvoices(sortBy, direction, startDate, endDate));
    }

    @GetMapping("/reservation/{reservationId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<InvoiceResponse>> getInvoicesByReservation(@PathVariable UUID reservationId) {
        return ResponseEntity.ok(invoiceService.getInvoicesByReservation(reservationId));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<List<InvoiceResponse>> getInvoicesByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(invoiceService.getInvoicesByUser(userId));
    }

    @PutMapping("/{invoiceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<InvoiceResponse> updateInvoice(@PathVariable UUID invoiceId,
                                                         @Valid @RequestBody InvoiceRequest request) {
        return ResponseEntity.ok(invoiceService.updateInvoice(invoiceId, request));
    }

    @DeleteMapping("/{invoiceId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteInvoice(@PathVariable UUID invoiceId) {
        invoiceService.deleteInvoice(invoiceId);
        return ResponseEntity.noContent().build();
    }


    @GetMapping("/factures")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<List<InvoiceResponse>> getAllFactures(
            @RequestParam(defaultValue = "number") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(invoiceService.getAllFactures(sortBy, direction, startDate, endDate));
    }

    @GetMapping("/factures/reservation/{reservationId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<InvoiceResponse>> getFacturesByReservation(@PathVariable UUID reservationId) {
        return ResponseEntity.ok(invoiceService.getFacturesByReservation(reservationId));
    }

    @PostMapping("/{invoiceId}/send-proforma")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<Void> sendProforma(@PathVariable UUID invoiceId) {
        invoiceEmailService.sendProformaByEmail(invoiceId);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/{invoiceId}/send-facture")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<Void> sendFacture(@PathVariable UUID invoiceId) {
        invoiceEmailService.sendFactureByEmail(invoiceId);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/{invoiceId}/toggle-company-type")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<InvoiceResponse> toggleCompanyType(@PathVariable UUID invoiceId) {
        return ResponseEntity.ok(invoiceService.toggleCompanyType(invoiceId));
    }
}