package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * The exchange rates the owner sets in the back office, written the way one says them: the three
 * amounts are worth the same, e.g. "10 EUR = 13.6 USD = 34 TND". A single row (id 1), see
 * V58__currency_rates.sql.
 */
@Entity
@Table(name = "currency_rates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CurrencyRates {

    public static final short SINGLETON_ID = 1;

    @Id
    private Short id;

    @Column(name = "eur_amount", nullable = false, precision = 15, scale = 4)
    private BigDecimal eurAmount;

    @Column(name = "usd_amount", nullable = false, precision = 15, scale = 4)
    private BigDecimal usdAmount;

    @Column(name = "tnd_amount", nullable = false, precision = 15, scale = 4)
    private BigDecimal tndAmount;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
