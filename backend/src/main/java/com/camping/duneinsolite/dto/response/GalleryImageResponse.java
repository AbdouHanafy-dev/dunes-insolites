package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.CompanyType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/** Backoffice shape — the full row, for the admin gallery CRUD. */
@Data
public class GalleryImageResponse {
    private UUID galleryItemId;
    private String imageUrl;
    private String alt;
    private String tag;
    private boolean tall;
    private Integer position;
    private CompanyType companyType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
