package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A staff-entered "this TourType isn't taking bookings on this date" marker
 * — purely operational visibility, not enforced anywhere in the booking
 * flow. Deliberately scoped to TourType (the real, already-CRUD'd backend
 * entity), not "accommodation" (Desert Tent / Desert Room / Dune Suite):
 * that model only exists in the frontend's seed data today (DI-012, not
 * yet migrated to a real backend entity) - building availability against
 * it here would mean inventing a second, competing definition of the same
 * not-yet-decided thing. See docs/cms.md.
 *
 * No relation to ReservationServiceImpl at all - this never touches
 * reservation creation, pricing, or status. It exists purely so the
 * calendar (AvailabilityServiceImpl.getCalendar) can show a manually
 * marked closure next to the real, already-booked count for that day.
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
