package com.camping.duneinsolite.dto.response.publicapi;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Wire shape for GET /api/public/pages/{slug}. Only ever a PUBLISHED page —
 * see PageServiceImpl.getPublishedPageBySlug. Block data is parsed from the
 * admin's stored JSON string into a real object here, so the vitrine never
 * has to parse JSON-in-JSON itself.
 */
@Data
public class PublicPageResponse {
    private String slug;
    private String title;
    private String locale;
    private String seoTitle;
    private String metaDescription;
    private String canonicalUrl;
    private boolean noIndex;
    private boolean noFollow;
    private String ogTitle;
    private String ogDescription;
    private String ogImageUrl;
    private List<Block> blocks;

    @Data
    public static class Block {
        private String type;
        private Map<String, Object> data;
    }
}
