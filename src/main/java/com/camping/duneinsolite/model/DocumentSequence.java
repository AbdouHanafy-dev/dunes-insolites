package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "document_sequences",
       uniqueConstraints = @UniqueConstraint(columnNames = {"type", "year"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DocumentSequence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "last_number", nullable = false)
    @Builder.Default
    private Integer lastNumber = 0;
}
