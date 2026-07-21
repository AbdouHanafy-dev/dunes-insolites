package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.ProductType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "user_product_remises")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserProductRemise {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", nullable = false)
    private ProductType productType;

    @Column(name = "product_name", nullable = false)
    private String productName;

    // For TOUR and TOURTYPE — null for EXTRA
    @Column(name = "adult_remise")
    private Double adultRemise;

    @Column(name = "child_remise")
    private Double childRemise;

    // For EXTRA only — null for TOUR and TOURTYPE
    @Column(name = "unit_remise")
    private Double unitRemise;
}
