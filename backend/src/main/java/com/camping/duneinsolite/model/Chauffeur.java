package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.util.UUID;

@Entity
@Table(name = "chauffeurs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Chauffeur {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "chauffeur_id", updatable = false, nullable = false)
    private UUID chauffeurId;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "phone_number")
    private String phoneNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    // Optional link to a real driver account (User.role == CHAUFFEUR) so
    // that account can see this trip. Most assignments have none - this
    // stays a free-text name/phone snapshot either way.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_user_id")
    private User driverUser;
}