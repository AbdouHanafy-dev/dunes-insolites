package com.camping.duneinsolite.service;

import com.camping.duneinsolite.model.Invoice;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.enums.CompanyType;

/**
 * Converts a reservation's immutable commercial snapshot into the appropriate
 * invoice / proforma representation and persists it according to the existing
 * business rules. Extracted from {@code ReservationServiceImpl} (final-hardening
 * pass) with no change to accounting policy, VAT handling, {@code Money}
 * arithmetic, the {@code DocumentSequence} semantics or company scoping —
 * see ADR-0004.
 *
 * <p>All methods run in the caller's transaction (default {@code REQUIRED}
 * propagation): the {@code DocumentSequence} pessimistic lock and the invoice
 * INSERT must commit atomically with the reservation state change that triggered
 * them.
 *
 * <p>Returns the persisted {@link Invoice} entity — both methods are called only
 * by other services below the controller boundary, never by a controller.
 */
public interface ReservationInvoiceService {

    /**
     * The auto PROFORMA raised on {@code PENDING → CONFIRMED}. Totals are
     * {@code HT + TVA} (no timbre fiscal on a proforma). {@code companyType} is
     * written through as given — it is not validated here (that guard, where it
     * exists, lives with the caller).
     */
    Invoice generateProforma(Reservation reservation, CompanyType companyType);

    /**
     * A STANDARD FACTURE. Totals are {@code HT + TVA + timbre fiscal}. Invoice
     * date is the reservation's completion date when set, otherwise today.
     * Used both by the auto path ({@code → COMPLETED}) and the manual
     * {@code generateFactureLater}.
     */
    Invoice generateFacture(Reservation reservation, CompanyType companyType);
}
