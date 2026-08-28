package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.PageRequest;
import com.camping.duneinsolite.dto.response.PageResponse;
import com.camping.duneinsolite.exception.PageSlugConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.PageMapper;
import com.camping.duneinsolite.model.Page;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageLocale;
import com.camping.duneinsolite.model.enums.PageStatus;
import com.camping.duneinsolite.repository.PageRepository;
import com.camping.duneinsolite.service.PageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PageServiceImpl implements PageService {

    private final PageRepository pageRepository;
    private final PageMapper pageMapper;

    @Override
    public PageResponse createPage(PageRequest request) {
        if (pageRepository.existsBySlugAndLocaleAndCompanyType(
                request.getSlug(), request.getLocale(), request.getCompanyType())) {
            throw new PageSlugConflictException(request.getSlug());
        }
        Page page = pageMapper.toEntity(request);
        if (page.getStatus() == null) {
            page.setStatus(PageStatus.DRAFT);
        }
        return pageMapper.toResponse(pageRepository.save(page));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse getPageById(UUID pageId) {
        return pageMapper.toResponse(findById(pageId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PageResponse> getAllPages() {
        return pageRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(pageMapper::toResponse).toList();
    }

    @Override
    public PageResponse updatePage(UUID pageId, PageRequest request) {
        Page page = findById(pageId);
        if (pageRepository.existsBySlugAndLocaleAndCompanyTypeAndPageIdNot(
                request.getSlug(), request.getLocale(), request.getCompanyType(), pageId)) {
            throw new PageSlugConflictException(request.getSlug());
        }
        pageMapper.updateEntity(request, page);
        return pageMapper.toResponse(pageRepository.save(page));
    }

    @Override
    public void deletePage(UUID pageId) {
        pageRepository.delete(findById(pageId));
    }

    @Override
    public PageResponse publishPage(UUID pageId) {
        Page page = findById(pageId);
        page.setStatus(PageStatus.PUBLISHED);
        page.setPublishedAt(LocalDateTime.now());
        return pageMapper.toResponse(pageRepository.save(page));
    }

    @Override
    public PageResponse unpublishPage(UUID pageId) {
        Page page = findById(pageId);
        page.setStatus(PageStatus.DRAFT);
        return pageMapper.toResponse(pageRepository.save(page));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PageResponse> getPublishedPageBySlug(String slug, PageLocale locale, CompanyType companyType) {
        return pageRepository.findBySlugAndLocaleAndCompanyType(slug, locale, companyType)
                .filter(page -> page.getStatus() == PageStatus.PUBLISHED)
                .map(pageMapper::toResponse);
    }

    private Page findById(UUID pageId) {
        return pageRepository.findById(pageId)
                .orElseThrow(() -> new ResourceNotFoundException("Page not found: " + pageId));
    }
}
