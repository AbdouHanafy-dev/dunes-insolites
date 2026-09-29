package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.ExternalBookingSource;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** Units sold outside the website and entered manually by staff. */
@Entity
@Table(name = "external_accommodation_bookings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExternalAccommodationBooking {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "accommodation_type_id", nullable = false)
    private AccommodationType accommodationType;

    @Column(name = "check_in", nullable = false)
    private LocalDate checkIn;

    @Column(name = "check_out", nullable = false)
    private LocalDate checkOut;

    @Column(name = "units", nullable = false)
    private int units;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 40)
    private ExternalBookingSource source;

    @Column(name = "external_reference", length = 120)
    private String externalReference;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
