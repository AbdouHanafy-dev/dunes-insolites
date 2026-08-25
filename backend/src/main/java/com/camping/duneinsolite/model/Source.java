package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.util.UUID;

@Entity
@Table(name = "sources")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Source {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "source_id", updatable = false, nullable = false)
    private UUID sourceId;

    @Column(name = "name", nullable = false)
    private String name;
}