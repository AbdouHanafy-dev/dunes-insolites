package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ProgramStep {

    @Column(name = "label")
    private String label;

    @Column(name = "title")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}
