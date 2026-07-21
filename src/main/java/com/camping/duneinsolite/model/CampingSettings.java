package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "camping_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CampingSettings {

    @Id
    private Long id;

    @Column(name = "max_capacity", nullable = false)
    private Integer maxCapacity;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
