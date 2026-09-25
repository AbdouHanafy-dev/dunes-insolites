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

    // By position in the itinerary, all optional and shown on the site only when filled:
    // the first step names a pickup point, the last a drop-off point, any step in
    // between an attraction.
    @Column(name = "pickup_point")
    private String pickupPoint;

    @Column(name = "dropoff_point")
    private String dropoffPoint;

    @Column(name = "attraction")
    private String attraction;

    // Any number of images for this step, shown in the step on the circuit page.
    @Convert(converter = ImageUrlListConverter.class)
    @Column(name = "image_urls", columnDefinition = "TEXT")
    private java.util.List<String> imageUrls = new java.util.ArrayList<>();
}
