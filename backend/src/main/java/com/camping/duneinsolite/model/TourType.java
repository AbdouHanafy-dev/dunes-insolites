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

    // Maximum nights bookable in one reservation, when this TourType is used
    // as a nuitée (Stay). 1 (default) = fixed single-night stay, the public
    // booking flow only asks for an arrival date. >1 = the guest picks an
    // arrival+departure range, capped at this many nights. Meaningless for a
    // Circuit's own TourType usage (Tour is a separate entity).
    @Column(name = "max_nights", nullable = false)
    @Builder.Default
    private Integer maxNights = 1;

    // Prices for direct passengers
    @Column(name = "passenger_adult_price", nullable = false)
    private java.math.BigDecimal passengerAdultPrice;

    @Column(name = "passenger_child_price", nullable = false)
    private java.math.BigDecimal passengerChildPrice;

    // Prices for partner bookings
    // Infants (0-3): free until the back office sets a price.
    @Column(name = "passenger_infant_price", nullable = false)
    @Builder.Default
    private java.math.BigDecimal passengerInfantPrice = java.math.BigDecimal.ZERO;

    @Column(name = "partner_adult_price", nullable = false)
    private java.math.BigDecimal partnerAdultPrice;

    @Column(name = "partner_child_price", nullable = false)
    private java.math.BigDecimal partnerChildPrice;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Whether a guest booking this stay must pick one of the GUIDE-category
     * GUIDE-category {@link Extra}s (support-vehicle guide, or guide in the
     * guest's own vehicle) before they can continue - some tours require
     * an accompanying guide, some don't. False by default: existing tours
     * behave exactly as before until an admin opts one in.
     */
    @Column(name = "guide_required", nullable = false)
    @Builder.Default
    private Boolean guideRequired = false;

    /**
     * Whether this nuitée offers accommodation types (Desert Tent / Room /
     * Dune Suite ...) for the guest to pick. True by default so existing
     * stays behave as before. When false the vitrine hides the accommodation
     * step and the stay is priced per person, like the bivouac.
     */
    @Column(name = "has_accommodation_types", nullable = false)
    @Builder.Default
    private Boolean hasAccommodationTypes = true;

    /**
     * True on the single nuitée that is THE Sabria camp multi-day circuits
     * sleep at: circuits read their accommodation tiers from this stay, whatever
     * its {@link #hasAccommodationTypes}. At most one row is true (enforced by a
     * partial unique index; TourTypeServiceImpl moves the flag).
     */
    @Column(name = "circuit_camp", nullable = false)
    @Builder.Default
    private Boolean circuitCamp = false;

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

    // From the admin-managed language catalog (SpokenLanguage), not the old
    // hardcoded FR/EN/AR enum.
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "tour_type_languages",
            joinColumns = @JoinColumn(name = "tour_type_id"),
            inverseJoinColumns = @JoinColumn(name = "language_id"))
    @Builder.Default
    private Set<SpokenLanguage> languages = new HashSet<>();

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
