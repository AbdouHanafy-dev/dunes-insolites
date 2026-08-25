package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.Currency;
import com.camping.duneinsolite.model.enums.PaymentMethod;
import com.camping.duneinsolite.model.enums.TransactionStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class PaymentResponse {

    // ── The transaction that was just created ─────────────────────
    private UUID transactionId;
    private String transactionNumber;
    private Double amount;
    private Currency currency;
    private PaymentMethod paymentMethod;
    private TransactionStatus status;
    private LocalDateTime transactionDate;

    // ── Updated payment state of the reservation ──────────────────
    // After each payment we return the updated summary so the frontend
    // can refresh the UI without a second API call
    private UUID reservationId;
    private PaymentSummary paymentSummary;
}