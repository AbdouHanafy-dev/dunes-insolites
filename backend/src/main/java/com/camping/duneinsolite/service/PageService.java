package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.PageRequest;
import com.camping.duneinsolite.dto.response.PageResponse;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageCategory;
import com.camping.duneinsolite.model.enums.PageLocale;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PageService {
    PageResponse createPage(PageRequest request);
    PageResponse getPageById(UUID pageId);
    List<PageResponse> getAllPages();
    PageResponse updatePage(UUID pageId, PageRequest request);
    void deletePage(UUID pageId);
    PageResponse publishPage(UUID pageId);
    PageResponse unpublishPage(UUID pageId);

    /** Vitrine-facing: only ever returns a PUBLISHED page, never a draft. */
    Optional<PageResponse> getPublishedPageBySlug(String slug, PageLocale locale, CompanyType companyType);

    /** Vitrine-facing: every PUBLISHED page in one category (e.g. /guides' index) - never a draft. */
    List<PageResponse> getPublishedPagesByCategory(PageCategory category, PageLocale locale, CompanyType companyType);
}
