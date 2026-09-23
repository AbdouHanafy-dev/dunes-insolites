package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.DepositMode;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * The business's payment rules - one row (id always 1), seeded by
 * V39__payment_policy.sql. Read when a payment request is sent to a client so
 * that a change of rule ("no deposit any more") is a settings edit, not a
 * deploy. Payment status itself is never stored here: it stays derived from
 * recorded transactions (see PaymentServiceImpl.computePaymentSummary).
 */
@Entity
@Table(name = "payment_policy")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentPolicy {

    @Id
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "deposit_mode", nullable = false, length = 16)
    private DepositMode depositMode;

    @Column(name = "deposit_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal depositPercent;

    /** Days before arrival the deposit is due; null = the arrival date itself. */
    @Column(name = "deadline_days_before")
    private Integer deadlineDaysBefore;

    @Column(name = "accept_online_link", nullable = false)
    private boolean acceptOnlineLink;

    @Column(name = "accept_bank_transfer", nullable = false)
    private boolean acceptBankTransfer;

    @Column(name = "accept_card_on_site", nullable = false)
    private boolean acceptCardOnSite;

    @Column(name = "accept_cash_on_site", nullable = false)
    private boolean acceptCashOnSite;

    @Column(name = "accept_cheque", nullable = false)
    private boolean acceptCheque;

    /** Free text appended to the payment email (IBAN, instructions...). */
    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist @PreUpdate
    void touch() {
        updatedAt = LocalDateTime.now();
    }
}
