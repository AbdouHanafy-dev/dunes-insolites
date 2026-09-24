package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.GroupSizeType;
import com.camping.duneinsolite.model.enums.ExtraCategory;
import com.camping.duneinsolite.model.enums.PickupField;
import com.camping.duneinsolite.model.enums.PricingUnit;
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

    // Public route key for the vitrine - carries the legacy WordPress slug so
    // the SEO migration doesn't change URLs. Nullable: existing rows predate
    // this column and are backfilled as each product goes public.
    @Column(name = "slug", unique = true)
    private String slug;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // For timed extras e.g. "1h30", "2h"
    @Column(name = "duration")
    private String duration;

    @Column(name = "unit_price", nullable = false)
    private java.math.BigDecimal unitPrice;

    // unitPrice is the price of one base duration; a longer session costs
    // unitPrice x (minutes / baseDurationMinutes). All in minutes.
    @Column(name = "base_duration_minutes", nullable = false)
    @Builder.Default
    private Integer baseDurationMinutes = 30;

    @Column(name = "duration_step_minutes", nullable = false)
    @Builder.Default
    private Integer durationStepMinutes = 30;

    // Equal to the base = the guest cannot extend the session.
    @Column(name = "max_duration_minutes", nullable = false)
    @Builder.Default
    private Integer maxDurationMinutes = 30;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Total units of this activity available per day (quads, camel-ride
     * seats...) - the ceiling {@link com.camping.duneinsolite.service.ExtraAvailabilityService}
     * enforces. NULL = inventory not configured, no ceiling enforced (same
     * convention as {@link AccommodationType#getMaxUnits()}) - Sandboarding
     * stays null since it has no commercial capacity limit.
     */
    @Column(name = "max_units_per_day")
    private Integer maxUnitsPerDay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ExtraCategory category = ExtraCategory.ACTIVITY;

    @Column(name = "service_type")
    private String serviceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_unit", nullable = false)
    @Builder.Default
    private PricingUnit pricingUnit = PricingUnit.PER_UNIT;

    @Column(name = "requires_customer_vehicle", nullable = false)
    @Builder.Default
    private boolean requiresCustomerVehicle = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "extra_pickup_fields", joinColumns = @JoinColumn(name = "extra_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "field_name")
    @Builder.Default
    private Set<PickupField> pickupFields = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "extra_required_pickup_fields", joinColumns = @JoinColumn(name = "extra_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "field_name")
    @Builder.Default
    private Set<PickupField> requiredPickupFields = new HashSet<>();

    @OneToMany(mappedBy = "extra", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ExtraResourceRequirement> resourceRequirements = new ArrayList<>();

    @Column(name = "tva", nullable = false)
    @Builder.Default
    private java.math.BigDecimal tva = java.math.BigDecimal.ZERO;

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

    // From the admin-managed language catalog (SpokenLanguage), not the old
    // hardcoded FR/EN/AR enum - which languages this activity/service is
    // offered in, product-level (not a specific guide's own languages, see
    // Guide.languages).
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "extra_languages",
            joinColumns = @JoinColumn(name = "extra_id"),
            inverseJoinColumns = @JoinColumn(name = "language_id"))
    @Builder.Default
    private Set<SpokenLanguage> languages = new HashSet<>();

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

    // Non-French marketing copy - name/description/aboutText/etc. columns
    // above are the French source of truth. See ContentLocale.
    @OneToMany(mappedBy = "extra", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ExtraTranslation> translations = new ArrayList<>();
}
