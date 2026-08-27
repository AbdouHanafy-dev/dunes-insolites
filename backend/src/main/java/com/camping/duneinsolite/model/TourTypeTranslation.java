package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.ContentLocale;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * One locale's worth of translated marketing copy for a TourType (nuitée).
 * The TourType's own name/description/aboutText/... columns stay the French
 * source of truth - see ContentLocale. Missing fields fall back to the
 * French base at read time (PublicCatalogTranslation), so a translation row
 * doesn't have to be complete to exist.
 */
@Entity
@Table(name = "tour_type_translations", uniqueConstraints = @UniqueConstraint(columnNames = {"tour_type_id", "locale"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TourTypeTranslation implements CatalogTranslation {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "tour_type_translation_id", updatable = false, nullable = false)
    private UUID tourTypeTranslationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tour_type_id", nullable = false)
    private TourType tourType;

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
    @CollectionTable(name = "tour_type_translation_highlights", joinColumns = @JoinColumn(name = "tour_type_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "highlight", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> highlights = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_type_translation_included_items", joinColumns = @JoinColumn(name = "tour_type_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> includedItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_type_translation_not_included_items", joinColumns = @JoinColumn(name = "tour_type_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> notIncludedItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tour_type_translation_program_steps", joinColumns = @JoinColumn(name = "tour_type_translation_id"))
    @OrderColumn(name = "step_order")
    @Builder.Default
    private List<ProgramStep> programSteps = new ArrayList<>();
}
