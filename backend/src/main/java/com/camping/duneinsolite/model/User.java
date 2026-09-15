package com.camping.duneinsolite.model;


import com.camping.duneinsolite.model.enums.LoyaltyTier;
import com.camping.duneinsolite.model.enums.UserRole;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
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

    // Only relevant when role = STAFF — the name of the CustomRole this
    // account's real permissions come from (see UserRole.STAFF's own
    // comment). Null for every other role.
    @Column(name = "custom_role_name")
    private String customRoleName;

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

    // When this CLIENT accepted the terms of service + privacy policy at
    // self-registration - null for staff/partner/seeded accounts, which
    // never went through that public consent checkbox in the first place
    // (see KeycloakUserSyncService.registerUser). A timestamp, not just a
    // boolean, so there's a real record of *when* consent was given -
    // relevant if the terms themselves ever change.
    @Column(name = "terms_accepted_at")
    private LocalDateTime termsAcceptedAt;

    // One user can have many reservations.
    //
    // Found live (relational-integrity audit), the single most serious
    // finding of that pass: this used to be cascade = CascadeType.ALL,
    // which includes REMOVE. Deleting a User cascaded to silently delete
    // every one of their reservations too - reproduced for real:
    // deleting a throwaway test account with one live reservation made
    // the reservation vanish from Postgres as a side effect, with no
    // warning, no confirmation, and no way to know it had happened short
    // of checking directly. This bypasses the database's own NO ACTION
    // constraint entirely, since Hibernate deletes the children in
    // application code before the parent delete ever reaches the DB - the
    // FK protection everyone assumes is there was never actually load-
    // bearing for this relationship. PERSIST+MERGE keeps the convenience
    // this was presumably added for (saving a User with reservations
    // already attached cascades the save); REMOVE never should have been
    // in scope for an operational record, let alone the one below.
    @OneToMany(mappedBy = "user", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, orphanRemoval = false)
    @Builder.Default
    private List<Reservation> reservations = new ArrayList<>();

    // One user can have many invoices.
    //
    // Same fix as reservations above, for a reason that matters even
    // more: invoices are numbered, legally significant financial
    // documents (see DocumentSequence and the invoice-sequence integrity
    // work this project treats as its highest-severity open item). A
    // cascade delete here wouldn't just lose operational data, it would
    // silently create gaps in a sequence that's supposed to be auditable.
    @OneToMany(mappedBy = "user", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, orphanRemoval = false)
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
