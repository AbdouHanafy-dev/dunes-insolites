package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.GroupSizeType;
import com.camping.duneinsolite.model.enums.Language;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "extras")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Extra {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "extra_id", updatable = false, nullable = false)
    private UUID extraId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // For timed extras e.g. "1h30", "2h"
    @Column(name = "duration")
    private String duration;

    @Column(name = "unit_price", nullable = false)
    private Double unitPrice;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "tva", nullable = false)
    @Builder.Default
    private Double tva = 0.0;

    @Column(name = "about_text", columnDefinition = "TEXT")
    private String aboutText;

    @ElementCollection
    @CollectionTable(name = "extra_highlights", joinColumns = @JoinColumn(name = "extra_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "highlight", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> highlights = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "extra_included_items", joinColumns = @JoinColumn(name = "extra_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> includedItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "extra_not_included_items", joinColumns = @JoinColumn(name = "extra_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> notIncludedItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "extra_program_steps", joinColumns = @JoinColumn(name = "extra_id"))
    @OrderColumn(name = "step_order")
    @Builder.Default
    private List<ProgramStep> programSteps = new ArrayList<>();

    @Column(name = "meeting_point")
    private String meetingPoint;

    @Column(name = "location")
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "group_size_type")
    private GroupSizeType groupSizeType;

    @ElementCollection
    @CollectionTable(name = "extra_languages", joinColumns = @JoinColumn(name = "extra_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "language")
    @Builder.Default
    private Set<Language> languages = new HashSet<>();

    @Embedded
    private CancellationPolicy cancellationPolicy;

    @Embedded
    private ExtraDuration extraDuration;

    @Column(name = "cover_photo_url")
    private String coverPhotoUrl;

    @ElementCollection
    @CollectionTable(name = "extra_photos", joinColumns = @JoinColumn(name = "extra_id"))
    @OrderColumn(name = "display_order")
    @Builder.Default
    private List<Photo> photos = new ArrayList<>();

    @Column(name = "average_rating")
    private Double averageRating;

    @Column(name = "review_count")
    @Builder.Default
    private Integer reviewCount = 0;
}