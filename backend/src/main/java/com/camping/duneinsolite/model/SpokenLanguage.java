package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.util.UUID;

/**
 * An admin-managed language — replaces the old hardcoded FR/EN/AR enum
 * (Guide.languages, Reservation.preferredLanguages) so a guide who speaks
 * German or Italian isn't unrepresentable. `active` lets admin retire a
 * language from new selections without breaking guides/reservations that
 * already reference it (no delete endpoint on purpose - a hard delete would
 * either orphan those or need a cascade nobody asked for).
 */
@Entity
@Table(name = "spoken_languages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SpokenLanguage {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "language_id", updatable = false, nullable = false)
    private UUID languageId;

    @Column(name = "name", nullable = false, unique = true)
    private String name;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
