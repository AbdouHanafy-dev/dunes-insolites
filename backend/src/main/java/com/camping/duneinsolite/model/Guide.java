package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;
}