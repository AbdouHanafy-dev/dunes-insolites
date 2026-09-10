package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.dto.request.InvoiceRequest;
import com.camping.duneinsolite.dto.response.InvoiceResponse;
import com.camping.duneinsolite.mapper.InvoiceMapper;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.InvoiceStatus;
import com.camping.duneinsolite.model.enums.InvoiceType;
import com.camping.duneinsolite.model.enums.PaymentStatus;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;
    private final InvoiceMapper invoiceMapper;
    private final com.camping.duneinsolite.security.CallerContext caller;

    // Sentinel bounds an open-ended startDate/endDate resolves to, so the repository
    // query always binds two concrete LocalDate values — see InvoiceRepository for why.
    private static final LocalDate MIN_DATE = LocalDate.of(1900, 1, 1);
    private static final LocalDate MAX_DATE = LocalDate.of(2999, 12, 31);

    @Override
    public InvoiceResponse createInvoice(InvoiceRequest request) {
        Reservation reservation = reservationRepository.findById(request.getReservationId())
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + request.getReservationId()));

        User user = reservation.getUser();

        Invoice invoice = Invoice.builder()
                .invoiceNumber(generateInvoiceNumber())
                .invoiceType(request.getInvoiceType())
                .dueDate(request.getDueDate())
                .totalAmount(request.getTotalAmount())
                .paidAmount(com.camping.duneinsolite.money.Money.ZERO)
                .status(InvoiceStatus.DRAFT)
                .paymentStatus(PaymentStatus.UNPAID)
                .reservation(reservation)
                .user(user)
                .build();

        request.getItems().forEach(itemReq -> {
            InvoiceItem item = InvoiceItem.builder()
                    .description(itemReq.getDescription())
                    .itemType(itemReq.getItemType())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(itemReq.getUnitPrice())
                    .lineNumber(itemReq.getLineNumber())
                    .build();
            invoice.addItem(item);
        });

        return invoiceMapper.toResponse(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(UUID invoiceId) {
        Invoice invoice = findById(invoiceId);
        // IDOR fix (Phase 4): endpoint is only isAuthenticated(); an invoice is
        // a financial document carrying the customer's name, address and
        // matricule fiscal. Staff see any; a customer sees only their own.
        caller.requireStaffOrOwner(ownerOf(invoice));
        return invoiceMapper.toResponse(invoice);
    }

    /** The customer a invoice belongs to — its own user, or its reservation's. */
    private UUID ownerOf(Invoice invoice) {
        if (invoice.getUser() != null) return invoice.getUser().getUserId();
        if (invoice.getReservation() != null && invoice.getReservation().getUser() != null) {
            return invoice.getReservation().getUser().getUserId();
        }
        return null;
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getAllInvoices(String sortBy, String direction, LocalDate startDate, LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : MIN_DATE;
        LocalDate end   = endDate   != null ? endDate   : MAX_DATE;
        return invoiceRepository.findAllWithItems(start, end).stream()
                .sorted(invoiceComparator(sortBy, direction))
                .map(invoiceMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getInvoicesByReservation(UUID reservationId) {
        requireReservationAccess(reservationId);
        return invoiceRepository.findByReservationIdWithItems(reservationId).stream()
                .map(invoiceMapper::toResponse)
                .toList();
    }

    // IDOR fix (Phase 4): the /reservation/{id} and /factures/reservation/{id}
    // endpoints are only isAuthenticated(). Scope them to the reservation's
    // owner (or staff) before listing its invoices.
    private void requireReservationAccess(UUID reservationId) {
        if (caller.isStaff()) return;
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));
        caller.requireStaffOrOwner(reservation.getUser() != null ? reservation.getUser().getUserId() : null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getInvoicesByUser(UUID userId) {
        return invoiceRepository.findByUserUserId(userId).stream()
                .map(invoiceMapper::toResponse).toList();
    }

    @Override
    public InvoiceResponse updateInvoice(UUID invoiceId, InvoiceRequest request) {
        Invoice invoice = findById(invoiceId);
        invoice.setInvoiceType(request.getInvoiceType());
        invoice.setDueDate(request.getDueDate());
        invoice.setTotalAmount(request.getTotalAmount());
        return invoiceMapper.toResponse(invoiceRepository.save(invoice));
    }

    @Override
    public void deleteInvoice(UUID invoiceId) {
        invoiceRepository.delete(findById(invoiceId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getAllFactures(String sortBy, String direction, LocalDate startDate, LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : MIN_DATE;
        LocalDate end   = endDate   != null ? endDate   : MAX_DATE;
        return invoiceRepository.findByInvoiceTypeWithItems(InvoiceType.STANDARD, start, end).stream()
                .sorted(invoiceComparator(sortBy, direction))
                .map(invoiceMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getFacturesByReservation(UUID reservationId) {
        requireReservationAccess(reservationId);
        return invoiceRepository
                .findByInvoiceTypeAndReservationIdWithItems(InvoiceType.STANDARD, reservationId).stream()
                .map(invoiceMapper::toResponse)
                .toList();
    }

    // TODO(company-scoping, blocked on docs/OPEN-QUESTIONS.md Q4): no status
    // check - a SENT, numbered, stamped invoice can have its legal entity
    // flipped by this call exactly as freely as a DRAFT. ARCHITECTURE.md
    // §13 Critical #2 already tracks this; not fixed here on purpose - the
    // correct remedy (credit note + reissue vs. blocking the toggle once
    // issued) is Q4's call, needs the accountant, and touches the same
    // DocumentSequence gap Q4 is already paused on. Re-confirmed live
    // 30 Aug 2026: zero real invoices exist yet, so nothing has been
    // wrongly toggled today - this is the exact code path to guard the
    // moment invoicing starts for real.
    @Override
    public InvoiceResponse toggleCompanyType(UUID invoiceId) {
        Invoice invoice = findById(invoiceId);
        CompanyType current = invoice.getCompanyType() != null ? invoice.getCompanyType() : CompanyType.DUNES_INSOLITES;
        invoice.setCompanyType(current == CompanyType.ROUTE_INSOLITE ? CompanyType.DUNES_INSOLITES : CompanyType.ROUTE_INSOLITE);
        return invoiceMapper.toResponse(invoiceRepository.save(invoice));
    }

    private String generateInvoiceNumber() {
        long count = invoiceRepository.count() + 1;
        return String.format("INV-%05d", count);
    }

    // invoiceNumber is "SEQ/YEAR" (e.g. "028/2026"), with the sequence resetting to 1 every
    // calendar year per type — plain string comparison breaks across year boundaries
    // (e.g. "099/2026" > "005/2027" lexicographically despite 2027 being later), so sorting
    // by number means parsing out (year, sequence) and comparing those instead.
    private static final Pattern INVOICE_NUMBER_PATTERN = Pattern.compile("(\\d+)/(\\d{4})");

    private int[] parseInvoiceNumber(String invoiceNumber) {
        if (invoiceNumber != null) {
            Matcher m = INVOICE_NUMBER_PATTERN.matcher(invoiceNumber);
            if (m.matches()) {
                return new int[]{ Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1)) };
            }
        }
        // Malformed/legacy invoice numbers (e.g. "FAC-15/2026") sort as the oldest possible entry
        return new int[]{ Integer.MIN_VALUE, Integer.MIN_VALUE };
    }

    private Comparator<Invoice> invoiceComparator(String sortBy, String direction) {
        Comparator<Invoice> comparator = "date".equalsIgnoreCase(sortBy)
                ? Comparator.comparing(Invoice::getInvoiceDate, Comparator.nullsFirst(Comparator.naturalOrder()))
                : Comparator.comparing((Invoice i) -> parseInvoiceNumber(i.getInvoiceNumber()),
                        Comparator.<int[]>comparingInt(k -> k[0]).thenComparingInt(k -> k[1]));
        return "asc".equalsIgnoreCase(direction) ? comparator : comparator.reversed();
    }

    private Invoice findById(UUID invoiceId) {
        return invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));
    }
}
