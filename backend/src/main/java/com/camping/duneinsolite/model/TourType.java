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
@Table(name = "tour_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TourType {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "tour_type_id", updatable = false, nullable = false)
    private UUID tourTypeId;

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

    // Prices for direct passengers
    @Column(name = "passenger_adult_price", nullable = false)
    private java.math.BigDecimal passengerAdultPrice;

    @Column(name = "passenger_child_price", nullable = false)
    private java.math.BigDecimal passengerChildPrice;

    // Prices for partner bookings
    @Column(name = "partner_adult_price", nullable = false)
    private java.math.BigDecimal partnerAdultPrice;

    @Column(name = "partner_child_price", nullable = false)
    private java.math.BigDecimal partnerChildPrice;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Whether a guest booking this stay must pick one of the GUIDE-category
     * {@link ServiceOption}s (support-vehicle guide, or guide in the
     * guest's own vehicle) before they can continue - some tours require
     * an accompanying guide, some don't. False by default: existing tours
     * behave exactly as before until an admin opts one in.
     */
    @Column(name = "guide_required", nullable = false)
    @Builder.Default
    private Boolean guideRequired = false;

    @Column(name = "tva", nullable = false)
    @Builder.Default
    private java.math.BigDecimal tva = java.math.BigDecimal.ZERO;

    @Column(name = "about_text", columnDefinition = "TEXT")
    private String aboutText;

    @ElementCollection
    @CollectionTable(name = "tour_type_highlights", joinColumns = @JoinColumn(name = "tour_type_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "highlight", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> highlights = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_type_included_items", joinColumns = @JoinColumn(name = "tour_type_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> includedItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_type_not_included_items", joinColumns = @JoinColumn(name = "tour_type_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> notIncludedItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_type_program_steps", joinColumns = @JoinColumn(name = "tour_type_id"))
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
    @CollectionTable(name = "tour_type_languages", joinColumns = @JoinColumn(name = "tour_type_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "language")
    @Builder.Default
    private Set<Language> languages = new HashSet<>();

    @Embedded
    private CancellationPolicy cancellationPolicy;

    @Column(name = "cover_photo_url")
    private String coverPhotoUrl;

    @ElementCollection
    @CollectionTable(name = "tour_type_photos", joinColumns = @JoinColumn(name = "tour_type_id"))
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
    @OneToMany(mappedBy = "tourType", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TourTypeTranslation> translations = new ArrayList<>();
}