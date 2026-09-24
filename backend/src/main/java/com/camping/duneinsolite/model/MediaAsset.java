package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.CompanyType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One uploaded file, stored on local disk (see MediaServiceImpl —
 * app.upload-dir) and served back via a public static resource mapping
 * (/media/**, see WebConfig + SecurityConfig). Local disk, not object
 * storage — the simplest thing that works without a cloud account;
 * storedFilename is the only thing that matters for actually finding the
 * bytes on disk, everything else is metadata for the admin UI.
 */
@Entity
@Table(name = "media_assets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MediaAsset {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "asset_id", updatable = false, nullable = false)
    private UUID assetId;

    // The name the editor uploaded it as — shown in the admin UI.
    @Column(name = "filename", nullable = false)
    private String filename;

    // UUID-prefixed name actually on disk — never guessable from
    // `filename` alone, so two uploads named "photo.jpg" never collide.
    @Column(name = "stored_filename", nullable = false, unique = true)
    private String storedFilename;

    @Column(name = "mime_type", nullable = false)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", nullable = false)
    private CompanyType companyType;

    // Manual library order (drag and drop). Lower first; 0 = not placed yet,
    // so a fresh upload shows at the top.
    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
