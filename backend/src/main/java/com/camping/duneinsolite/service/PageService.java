package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.PageRequest;
import com.camping.duneinsolite.dto.response.PageResponse;

import java.util.List;
import java.util.UUID;

public interface PageService {
    PageResponse createPage(PageRequest request);
    PageResponse getPageById(UUID pageId);
    List<PageResponse> getAllPages();
    PageResponse updatePage(UUID pageId, PageRequest request);
    void deletePage(UUID pageId);
    PageResponse publishPage(UUID pageId);
    PageResponse unpublishPage(UUID pageId);
}
