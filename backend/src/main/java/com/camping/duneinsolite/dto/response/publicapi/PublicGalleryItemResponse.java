package com.camping.duneinsolite.dto.response.publicapi;

import lombok.Data;

/**
 * The vitrine's GalleryItem wire shape — matches @dunes/api-types exactly
 * ({ src, alt, tag, tall }), so frontend/lib/api.ts consumes it with no
 * mapping. `src` is the entity's imageUrl.
 */
@Data
public class PublicGalleryItemResponse {
    private String src;
    private String alt;
    private String tag;
    private boolean tall;
}
