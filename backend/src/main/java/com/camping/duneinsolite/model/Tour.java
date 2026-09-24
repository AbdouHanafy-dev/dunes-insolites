package com.camping.duneinsolite.model;


import com.camping.duneinsolite.model.enums.GroupSizeType;
import com.camping.duneinsolite.model.enums.GuideType;
import com.camping.duneinsolite.model.enums.ProductStatus;
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

    // Public sale price for the direct-passenger adult rate only - the one
    // rate shown on cards/listings. Nullable: no sale running. When set,
    // it's what a guest actually pays; passengerAdultPrice becomes the
    // struck-through "was" price. Never confused with UserProductRemise,
    // which is a private per-user discount, not a public sale.
    @Column(name = "sale_price_adult")
    private java.math.BigDecimal salePriceAdult;

    @Column(name = "passenger_child_price", nullable = false)
    private java.math.BigDecimal passengerChildPrice;

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

    // Admin wizard workflow, separate from isActive (the public-visibility
    // flag). Only submitForReview/approve/reject move this - never settable
    // directly via create/update, so a client can't self-publish.
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ProductStatus status = ProductStatus.DRAFT;

    @Column(name = "insurance_confirmed", nullable = false)
    @Builder.Default
    private Boolean insuranceConfirmed = false;

    @Column(name = "compliance_confirmed", nullable = false)
    @Builder.Default
    private Boolean complianceConfirmed = false;

    @Column(name = "copyright_confirmed", nullable = false)
    @Builder.Default
    private Boolean copyrightConfirmed = false;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

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
    @CollectionTable(name = "tour_keywords", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "keyword", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> keywords = new ArrayList<>();

    // Who guides the customers - TOUR_GUIDE's language(s) are the `languages`
    // field below (not duplicated onto a second field).
    @Enumerated(EnumType.STRING)
    @Column(name = "guide_type", nullable = false)
    @Builder.Default
    private GuideType guideType = GuideType.NONE;

    // When true, this multi-day circuit sleeps a night at the Sabria camp —
    // the guest picks an accommodation tier (Tente/Chambre/Suite) the same
    // way a nuitée-campement guest does, reusing that catalogue's tiers
    // (there is only one physical camp). See
    // the stay flagged TourType.circuitCamp.
    @Column(name = "overnights_at_camp", nullable = false)
    @Builder.Default
    private Boolean overnightsAtCamp = false;

    @Column(name = "food_included", nullable = false)
    @Builder.Default
    private Boolean foodIncluded = false;

    @ElementCollection
    @CollectionTable(name = "tour_meals", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "display_order")
    @Builder.Default
    private List<Meal> meals = new ArrayList<>();

    @Column(name = "drinks_included", nullable = false)
    @Builder.Default
    private Boolean drinksIncluded = false;

    @ElementCollection
    @CollectionTable(name = "tour_dietary_restrictions", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "restriction", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> dietaryRestrictions = new ArrayList<>();

    @Column(name = "transport_included", nullable = false)
    @Builder.Default
    private Boolean transportIncluded = false;

    @ElementCollection
    @CollectionTable(name = "tour_transport_modes", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "mode", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> transportModes = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_not_suitable_for", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> notSuitableFor = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_not_allowed", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> notAllowed = new ArrayList<>();

    @Column(name = "animals_accepted", nullable = false)
    @Builder.Default
    private Boolean animalsAccepted = false;

    @Column(name = "pet_policy_note", columnDefinition = "TEXT")
    private String petPolicyNote;

    @ElementCollection
    @CollectionTable(name = "tour_must_bring", joinColumns = @JoinColumn(name = "tour_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> mustBring = new ArrayList<>();

    @Column(name = "good_to_know", columnDefinition = "TEXT")
    private String goodToKnow;

    @Column(name = "emergency_phone")
    private String emergencyPhone;

    @Column(name = "ticket_info", columnDefinition = "TEXT")
    private String ticketInfo;

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