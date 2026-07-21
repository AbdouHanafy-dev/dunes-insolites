package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Invoice;
import com.camping.duneinsolite.model.enums.InvoiceType;
import com.camping.duneinsolite.model.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    List<Invoice> findByReservationReservationId(UUID reservationId);
    List<Invoice> findByUserUserId(UUID userId);
    List<Invoice> findByPaymentStatus(PaymentStatus paymentStatus);
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    long countByInvoiceType(InvoiceType invoiceType);
    List<Invoice> findByInvoiceTypeAndReservationReservationId(InvoiceType invoiceType, UUID reservationId);

    List<Invoice> findByInvoiceType(InvoiceType invoiceType);

    // Returns the highest numeric prefix already used for a given type+year.
    // e.g. for "007/2026" it extracts 7. Returns 0 if no invoices exist yet.
    @Query(value = """
        SELECT COALESCE(
            MAX(CAST(SPLIT_PART(invoice_number, '/', 1) AS INTEGER)),
            0)
        FROM invoices
        WHERE invoice_type = :type
          AND SPLIT_PART(invoice_number, '/', 2) = :year
        """, nativeQuery = true)
    int findMaxNumberByTypeAndYear(@Param("type") String type, @Param("year") String year);

    // JOIN FETCH variants — eager-load items to avoid N+1 and lazy-load failures.
    // start/end must always be concrete (non-null) values — callers resolve an
    // open-ended bound to a sentinel date first. A bare ":param IS NULL" test mixed
    // with a typed comparison on the same parameter is a known Hibernate/Postgres
    // parameter-binding trouble spot, so it's avoided entirely here.
    @Query("SELECT DISTINCT i FROM Invoice i LEFT JOIN FETCH i.items " +
           "WHERE i.invoiceDate >= :start AND i.invoiceDate <= :end " +
           "ORDER BY i.invoiceDate DESC")
    List<Invoice> findAllWithItems(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT DISTINCT i FROM Invoice i LEFT JOIN FETCH i.items WHERE i.invoiceType = :type " +
           "AND i.invoiceDate >= :start AND i.invoiceDate <= :end")
    List<Invoice> findByInvoiceTypeWithItems(@Param("type") InvoiceType type,
                                              @Param("start") LocalDate start,
                                              @Param("end") LocalDate end);

    @Query("SELECT DISTINCT i FROM Invoice i LEFT JOIN FETCH i.items WHERE i.reservation.reservationId = :rid")
    List<Invoice> findByReservationIdWithItems(@Param("rid") UUID rid);

    @Query("SELECT DISTINCT i FROM Invoice i LEFT JOIN FETCH i.items WHERE i.invoiceType = :type AND i.reservation.reservationId = :rid")
    List<Invoice> findByInvoiceTypeAndReservationIdWithItems(@Param("type") InvoiceType type, @Param("rid") UUID rid);
}