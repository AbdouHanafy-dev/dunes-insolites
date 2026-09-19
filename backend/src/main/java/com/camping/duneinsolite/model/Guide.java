package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "guides")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Guide {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "guide_id", updatable = false, nullable = false)
    private UUID guideId;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "phone_number")
    private String phoneNumber;

    // The guide's own translator role: which languages they can guide a
    // group in, from the admin-managed catalog (SpokenLanguage) - not the
    // hardcoded FR/EN/AR enum, since real guides speak German, Italian,
    // etc. Lets admin match a guide to Reservation.preferredLanguages
    // instead of guessing from a name. Separate from Extra.languages, which
    // is the product/tour-level "offered in" list, not a specific person's.
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "guide_languages",
            joinColumns = @JoinColumn(name = "guide_id"),
            inverseJoinColumns = @JoinColumn(name = "language_id"))
    @Builder.Default
    private Set<SpokenLanguage> languages = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;
}