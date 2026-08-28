package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.ContentBlockResponse;
import com.camping.duneinsolite.dto.response.PageResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicPageResponse;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageLocale;
import com.camping.duneinsolite.service.ContentBlockService;
import com.camping.duneinsolite.service.PageService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Unauthenticated, vitrine-shaped read for one CMS page — see
 * SecurityConfig, /api/public/** is permitAll. Only ever returns a
 * PUBLISHED page (PageServiceImpl.getPublishedPageBySlug); a draft, or no
 * page at all, is a 404 either way so the vitrine can't tell the difference
 * between "not written yet" and "not published yet" — it doesn't need to,
 * it just falls back to its own hardcoded content in both cases.
 */
@RestController
@RequestMapping("/api/public/pages")
@RequiredArgsConstructor
public class PublicPageController {

    // Not autowired: no ObjectMapper bean is registered in this app's
    // context (Spring Boot's Jackson autoconfiguration provides one to the
    // HTTP message converters internally, but not as an injectable bean
    // here), and this only needs plain JSON parsing - no custom modules.
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final PageService pageService;
    private final ContentBlockService contentBlockService;

    @GetMapping("/{slug}")
    public ResponseEntity<PublicPageResponse> getPage(
            @PathVariable String slug,
            @RequestParam(defaultValue = "FR") PageLocale locale,
            @RequestParam(defaultValue = "DUNES_INSOLITES") CompanyType companyType) {
        return pageService.getPublishedPageBySlug(slug, locale, companyType)
                .map(this::toPublicResponse)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private PublicPageResponse toPublicResponse(PageResponse page) {
        PublicPageResponse response = new PublicPageResponse();
        response.setSlug(page.getSlug());
        response.setTitle(page.getTitle());
        response.setLocale(page.getLocale() != null ? page.getLocale().name() : null);
        response.setSeoTitle(page.getSeoTitle());
        response.setMetaDescription(page.getMetaDescription());
        response.setCanonicalUrl(page.getCanonicalUrl());
        response.setNoIndex(Boolean.TRUE.equals(page.getNoIndex()));
        response.setNoFollow(Boolean.TRUE.equals(page.getNoFollow()));
        response.setOgTitle(page.getOgTitle());
        response.setOgDescription(page.getOgDescription());
        response.setOgImageUrl(page.getOgImageUrl());
        response.setBlocks(
                (page.getBlocks() == null ? List.<com.camping.duneinsolite.dto.PageBlockDto>of() : page.getBlocks())
                        .stream()
                        .map(this::resolveBlock)
                        .toList());
        return response;
    }

    /**
     * A "blockReference" block ({"blockId": "..."}) is resolved to the
     * real ContentBlock's own type/data here — the vitrine never sees
     * "blockReference" as a type, just whatever the referenced block
     * actually is. A dangling reference (block deleted, wrong id) resolves
     * to an empty richText block rather than a 500 or broken data.
     */
    private PublicPageResponse.Block resolveBlock(com.camping.duneinsolite.dto.PageBlockDto b) {
        PublicPageResponse.Block block = new PublicPageResponse.Block();
        if ("blockReference".equals(b.getType())) {
            Map<String, Object> refData = parseBlockData(b.getDataJson());
            Object rawId = refData.get("blockId");
            ContentBlockResponse referenced = rawId == null ? null
                    : contentBlockService.findById(UUID.fromString(String.valueOf(rawId))).orElse(null);
            if (referenced == null) {
                block.setType("richText");
                block.setData(Map.of());
            } else {
                block.setType(referenced.getType());
                block.setData(parseBlockData(referenced.getDataJson()));
            }
            return block;
        }
        block.setType(b.getType());
        block.setData(parseBlockData(b.getDataJson()));
        return block;
    }

    private Map<String, Object> parseBlockData(String dataJson) {
        if (dataJson == null || dataJson.isBlank()) return Map.of();
        try {
            return OBJECT_MAPPER.readValue(dataJson, new TypeReference<LinkedHashMap<String, Object>>() {});
        } catch (Exception e) {
            // Malformed block JSON shouldn't 500 the whole page for a
            // visitor - render it as an empty block instead.
            return Map.of();
        }
    }
}
