package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.TourSegmentType;
import jakarta.persistence.*;
import lombok.*;

@Embeddable
@Getter @Setter @NoArgsConstructor
public class ProgramStep {

    @Column(name = "label")
    private String label;

    @Column(name = "title")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    public ProgramStep(String label, String title, String description) {
        this.label = label;
        this.title = title;
        this.description = description;
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "segment_type", nullable = false)
    private TourSegmentType segmentType = TourSegmentType.ACTIVITY;

    @Column(name = "optional_segment", nullable = false)
    private Boolean optionalSegment = false;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;
}
