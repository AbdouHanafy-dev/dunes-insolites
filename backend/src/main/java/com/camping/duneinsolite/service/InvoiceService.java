package com.camping.duneinsolite.service;


import com.camping.duneinsolite.dto.request.InvoiceRequest;
import com.camping.duneinsolite.dto.response.InvoiceResponse;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface InvoiceService {
    InvoiceResponse createInvoice(InvoiceRequest request);
    InvoiceResponse getInvoiceById(UUID invoiceId);
    List<InvoiceResponse> getAllInvoices(String sortBy, String direction, LocalDate startDate, LocalDate endDate);
    List<InvoiceResponse> getInvoicesByReservation(UUID reservationId);
    List<InvoiceResponse> getInvoicesByUser(UUID userId);
    InvoiceResponse updateInvoice(UUID invoiceId, InvoiceRequest request);
    void deleteInvoice(UUID invoiceId);

    List<InvoiceResponse> getAllFactures(String sortBy, String direction, LocalDate startDate, LocalDate endDate);
    List<InvoiceResponse> getFacturesByReservation(UUID reservationId);

    InvoiceResponse toggleCompanyType(UUID invoiceId);
}
