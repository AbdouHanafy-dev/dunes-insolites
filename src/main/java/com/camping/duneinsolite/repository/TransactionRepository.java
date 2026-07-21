package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Transaction;
import com.camping.duneinsolite.model.enums.TransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByReservationReservationId(UUID reservationId);
    List<Transaction> findByInvoiceInvoiceId(UUID invoiceId);
    List<Transaction> findByStatus(TransactionStatus status);

    // ── NEW — Sum of all COMPLETED transaction amounts for a reservation ──
    // Used in PaymentService to compute totalPaid without loading all objects
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
            "WHERE t.reservation.reservationId = :reservationId " +
            "AND t.status = 'COMPLETED'")
    Double sumCompletedAmountByReservationId(@Param("reservationId") UUID reservationId);
}