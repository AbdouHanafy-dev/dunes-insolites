package com.camping.duneinsolite.model;


import com.camping.duneinsolite.model.enums.LoyaltyTier;
import com.camping.duneinsolite.model.enums.UserRole;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(name = "user_id", updatable = false, nullable = false)
    private UUID userId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "phone")
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role;

    // Only relevant when role = CLIENT
    @Column(name = "loyalty_points")
    @Builder.Default
    private Integer loyaltyPoints = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "loyalty_tier")
    @Builder.Default
    private LoyaltyTier loyaltyTier = LoyaltyTier.BRONZE;

    // Only relevant when role = PARTENAIRE
    @Column(name = "matricule_fiscal")
    private String matriculeFiscal;

    @Column(name = "agency_address")
    private String agencyAddress;

    // One user can have many reservations
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = false)
    @Builder.Default
    private List<Reservation> reservations = new ArrayList<>();

    // One user can have many invoices
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = false)
    @Builder.Default
    private List<Invoice> invoices = new ArrayList<>();

    // One user can have many notifications
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnore
    private List<Notification> notifications = new ArrayList<>();

    @Column(name = "has_special_remise", columnDefinition = "boolean not null default false")
    @Builder.Default
    private Boolean hasSpecialRemise = false;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserProductRemise> remises = new ArrayList<>();
}
