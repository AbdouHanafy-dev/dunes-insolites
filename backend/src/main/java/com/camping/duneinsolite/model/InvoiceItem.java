package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "invoice_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceItem {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "invoice_item_id", updatable = false, nullable = false)
    private UUID invoiceItemId;

    // Many items belong to one invoice
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(name = "description", nullable = false)
    private String description;

    // e.g. "TOUR", "EXTRA", "FEE", "DISCOUNT"
    @Column(name = "item_type", nullable = false)
    private String itemType;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false)
    private java.math.BigDecimal unitPrice;

    // Line number controls display order on the invoice
    @Column(name = "line_number", nullable = false)
    private Integer lineNumber;

    // TVA rate (%) snapshotted per item; 0 if no TVA
    @Column(name = "tva", nullable = false)
    @Builder.Default
    private java.math.BigDecimal tva = java.math.BigDecimal.ZERO;

    // Date of the activity/service this line item represents
    @Column(name = "activity_date")
    private LocalDate activityDate;

    // End date for multi-night stays (hebergement only)
    @Column(name = "activity_end_date")
    private LocalDate activityEndDate;

    // totalPrice = quantity * unitPrice (HT); not stored
    @Transient
    public java.math.BigDecimal getTotalPrice() {
        if (quantity == null || unitPrice == null) return com.camping.duneinsolite.money.Money.ZERO;
        return com.camping.duneinsolite.money.Money.multiply(unitPrice, quantity);
    }
}
