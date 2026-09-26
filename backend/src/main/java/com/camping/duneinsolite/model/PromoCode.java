package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A promo code the owner gives a partner hotel, e.g. BADIRA10 = 10 % off a circuit. The discount is on
 * the circuit price only. The hotel earns {@link #commissionPercent} of the circuits it brought in;
 * the rate is left empty until the owner sets it. See V61__promo_codes.sql.
 */
@Entity
@Table(name = "promo_codes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PromoCode {

    @Id
    @GeneratedValue
    @Column(name = "promo_code_id")
    private UUID promoCodeId;

    /** Stored upper-case; matched ignoring case. */
    @Column(nullable = false, length = 40)
    private String code;

    @Column(name = "partner_name", nullable = false, length = 120)
    private String partnerName;

    @Column(name = "discount_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercent;

    @Column(name = "commission_percent", precision = 5, scale = 2)
    private BigDecimal commissionPercent;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    /** Usable on {@code day}: active and inside its validity window (either end may be open). */
    public boolean isUsableOn(LocalDate day) {
        if (!active) return false;
        if (validFrom != null && day.isBefore(validFrom)) return false;
        return validUntil == null || !day.isAfter(validUntil);
    }
}
