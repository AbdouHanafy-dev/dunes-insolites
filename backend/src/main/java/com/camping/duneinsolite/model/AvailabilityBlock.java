package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A staff-entered closure for one stay and one night. Every accommodation
 * tier belonging to that stay is unavailable; public availability and the
 * authoritative booking allocation both enforce the closure.
 */
@Entity
@Table(name = "availability_blocks", uniqueConstraints = @UniqueConstraint(columnNames = {"tour_type_id", "date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AvailabilityBlock {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "availability_block_id", updatable = false, nullable = false)
    private UUID availabilityBlockId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_type_id", nullable = false)
    private TourType tourType;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "note")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
