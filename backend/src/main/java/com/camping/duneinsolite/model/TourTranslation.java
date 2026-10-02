package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.ContentLocale;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * One locale's worth of translated marketing copy for a Tour. Mirrors
 * TourTypeTranslation/ExtraTranslation exactly (see CatalogTranslation) -
 * the Tour's own name/description/aboutText/... columns stay the French
 * source of truth. Missing fields fall back to the French base at read
 * time, so a translation row doesn't have to be complete to exist.
 */
@Entity
@Table(name = "tour_translations", uniqueConstraints = @UniqueConstraint(columnNames = {"tour_id", "locale"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TourTranslation implements CatalogTranslation {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "tour_translation_id", updatable = false, nullable = false)
    private UUID tourTranslationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    @Enumerated(EnumType.STRING)
    @Column(name = "locale", nullable = false)
    private ContentLocale locale;

    @Column(name = "name")
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "about_text", columnDefinition = "TEXT")
    private String aboutText;

    @ElementCollection
    @CollectionTable(name = "tour_translation_highlights", joinColumns = @JoinColumn(name = "tour_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "highlight", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> highlights = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_translation_included_items", joinColumns = @JoinColumn(name = "tour_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> includedItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_translation_not_included_items", joinColumns = @JoinColumn(name = "tour_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> notIncludedItems = new ArrayList<>();

    // Practical texts of a circuit (see V66). Tour only: TourType/Extra translations do not carry them.
    @Column(name = "good_to_know", columnDefinition = "TEXT")
    private String goodToKnow;

    @Column(name = "pet_policy_note", columnDefinition = "TEXT")
    private String petPolicyNote;

    @Column(name = "ticket_info", columnDefinition = "TEXT")
    private String ticketInfo;

    @ElementCollection
    @CollectionTable(name = "tour_translation_not_suitable_for", joinColumns = @JoinColumn(name = "tour_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> notSuitableFor = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_translation_not_allowed", joinColumns = @JoinColumn(name = "tour_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> notAllowed = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_translation_must_bring", joinColumns = @JoinColumn(name = "tour_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> mustBring = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_translation_program_steps", joinColumns = @JoinColumn(name = "tour_translation_id"))
    @OrderColumn(name = "step_order")
    @Builder.Default
    private List<ProgramStep> programSteps = new ArrayList<>();
}
