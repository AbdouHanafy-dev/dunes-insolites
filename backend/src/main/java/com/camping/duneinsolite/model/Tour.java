package com.camping.duneinsolite.model;


import com.camping.duneinsolite.model.enums.GroupSizeType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "tours")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Tour {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "tour_id", updatable = false, nullable = false)
    private UUID tourId;

    @Column(name = "name", nullable = false)
    private String name;

    // Public route key for the vitrine - carries the legacy WordPress slug so
    // the SEO migration doesn't change URLs. Nullable: existing rows predate
    // this column and are backfilled as each product goes public.
    @Column(name = "slug", unique = true)
    private String slug;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "duration")
    private String duration;

    @Column(name = "passenger_adult_price", nullable = false)
    private java.math.BigDecimal passengerAdultPrice;

    @Column(name = "passenger_child_price", nullable = false)
    private java.math.BigDecimal passengerChildPrice;

    @Column(name = "partner_adult_price", nullable = false)
    private java.math.BigDecimal partnerAdultPrice;

    @Column(name = "partner_child_price", nullable = false)
    private java.math.BigDecimal partnerChildPrice;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "tva", nullable = false)
    @Builder.Default
    private java.math.BigDecimal tva = java.math.BigDecimal.ZERO;

    @Column(name = "about_text", columnDefinition = "TEXT")
    private String aboutText;

    @ElementCollection
    @CollectionTable(name = "tour_highlights", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "highlight", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> highlights = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_included_items", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> includedItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_not_included_items", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> notIncludedItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_program_steps", joinColumns = @JoinColumn(name = "tour_id"))
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

    // From the admin-managed language catalog (SpokenLanguage), not the old
    // hardcoded FR/EN/AR enum.
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "tour_languages",
            joinColumns = @JoinColumn(name = "tour_id"),
            inverseJoinColumns = @JoinColumn(name = "language_id"))
    @Builder.Default
    private Set<SpokenLanguage> languages = new HashSet<>();

    @Embedded
    private CancellationPolicy cancellationPolicy;

    @Column(name = "cover_photo_url")
    private String coverPhotoUrl;

    @ElementCollection
    @CollectionTable(name = "tour_photos", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "display_order")
    @Builder.Default
    private List<Photo> photos = new ArrayList<>();

    @Column(name = "average_rating")
    private Double averageRating;

    @Column(name = "review_count")
    @Builder.Default
    private Integer reviewCount = 0;

    // Non-French marketing copy - name/description/aboutText/etc. columns
    // above are the French source of truth. See ContentLocale.
    @OneToMany(mappedBy = "tour", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TourTranslation> translations = new ArrayList<>();
}