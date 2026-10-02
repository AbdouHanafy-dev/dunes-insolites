package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.ContentLocale;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * One locale's worth of translated marketing copy for an Extra (on-site
 * add-on/activity). See TourTypeTranslation - same fallback-to-French model.
 */
@Entity
@Table(name = "extra_translations", uniqueConstraints = @UniqueConstraint(columnNames = {"extra_id", "locale"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExtraTranslation implements CatalogTranslation {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "extra_translation_id", updatable = false, nullable = false)
    private UUID extraTranslationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "extra_id", nullable = false)
    private Extra extra;

    @Enumerated(EnumType.STRING)
    @Column(name = "locale", nullable = false)
    private ContentLocale locale;

    @Column(name = "name")
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "about_text", columnDefinition = "TEXT")
    private String aboutText;

    /** Null = written by hand / saved before review tracking existed. See TranslationReviewStatus. */
    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", length = 20)
    private com.camping.duneinsolite.model.enums.TranslationReviewStatus reviewStatus;

    /** Fingerprint of the French source this translation was made from; lets the back office flag a stale one. */
    @Column(name = "source_hash", length = 64)
    private String sourceHash;

    @ElementCollection
    @CollectionTable(name = "extra_translation_highlights", joinColumns = @JoinColumn(name = "extra_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "highlight", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> highlights = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "extra_translation_included_items", joinColumns = @JoinColumn(name = "extra_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> includedItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "extra_translation_not_included_items", joinColumns = @JoinColumn(name = "extra_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "item", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> notIncludedItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "extra_translation_program_steps", joinColumns = @JoinColumn(name = "extra_translation_id"))
    @OrderColumn(name = "step_order")
    @Builder.Default
    private List<ProgramStep> programSteps = new ArrayList<>();
}
