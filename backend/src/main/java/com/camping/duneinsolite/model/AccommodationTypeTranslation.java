package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.ContentLocale;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * One language's copy of an accommodation tier: name, description and feature list. The tier's own
 * columns stay the French original; a field left empty here falls back to it at read time
 * (PublicCatalogTranslation), so a translation row does not have to be complete to exist.
 */
@Entity
@Table(name = "accommodation_type_translations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"accommodation_type_id", "locale"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AccommodationTypeTranslation {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "accommodation_type_translation_id", updatable = false, nullable = false)
    private UUID accommodationTypeTranslationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "accommodation_type_id", nullable = false)
    private AccommodationType accommodationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "locale", nullable = false)
    private ContentLocale locale;

    @Column(name = "name")
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Null = written by hand / saved before review tracking existed. See TranslationReviewStatus. */
    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", length = 20)
    private com.camping.duneinsolite.model.enums.TranslationReviewStatus reviewStatus;

    /** Fingerprint of the French source this translation was made from; lets the back office flag a stale one. */
    @Column(name = "source_hash", length = 64)
    private String sourceHash;

    @ElementCollection
    @CollectionTable(name = "accommodation_type_translation_features",
            joinColumns = @JoinColumn(name = "accommodation_type_translation_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "feature", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> features = new ArrayList<>();
}
