package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

/** A sellable Extra atomically consumes units from another Extra resource. */
@Entity
@Table(name = "extra_resource_requirements",
        uniqueConstraints = @UniqueConstraint(columnNames = {"extra_id", "resource_extra_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExtraResourceRequirement {
    @Id @GeneratedValue @UuidGenerator
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "extra_id", nullable = false)
    private Extra extra;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resource_extra_id", nullable = false)
    private Extra resource;
    @Column(nullable = false)
    private Integer quantity;
}
