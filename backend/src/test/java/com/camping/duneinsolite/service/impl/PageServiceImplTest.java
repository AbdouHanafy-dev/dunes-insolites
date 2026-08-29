package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.PageRequest;
import com.camping.duneinsolite.mapper.PageMapper;
import com.camping.duneinsolite.model.Page;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageLocale;
import com.camping.duneinsolite.model.enums.PageStatus;
import com.camping.duneinsolite.repository.PageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Found live, verified live, regression-tested here: PageMapper (real
 * MapStruct output, no NullValuePropertyMappingStrategy.IGNORE - unlike
 * UserMapper) overwrites noIndex/noFollow/status with null whenever a
 * PageRequest omits them, which the pages table's NOT NULL columns then
 * rejected with a raw SQL-constraint 400. The mocked mapper below
 * reproduces that exact overwrite behavior (real MapStruct output does
 * this too - confirmed against the actual running backend, not assumed),
 * so these tests fail without PageServiceImpl's own defaulting/
 * preservation logic and pass with it.
 */
class PageServiceImplTest {

    private PageRepository repository;
    private PageServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(PageRepository.class);
        PageMapper mapper = mock(PageMapper.class);

        // toEntity: builds a fresh Page carrying exactly what the request
        // says - null stays null, same as real MapStruct with no explicit
        // default.
        when(mapper.toEntity(any(PageRequest.class))).thenAnswer(inv -> {
            PageRequest r = inv.getArgument(0);
            return Page.builder()
                    .title(r.getTitle())
                    .slug(r.getSlug())
                    .locale(r.getLocale())
                    .companyType(r.getCompanyType())
                    .status(r.getStatus())
                    .noIndex(r.getNoIndex())
                    .noFollow(r.getNoFollow())
                    .seoTitle(r.getSeoTitle())
                    .build();
        });

        // updateEntity: overwrites the target's fields from the request -
        // including with null, exactly the real bug - no null-check.
        doAnswer(inv -> {
            PageRequest r = inv.getArgument(0);
            Page target = inv.getArgument(1);
            target.setTitle(r.getTitle());
            target.setSlug(r.getSlug());
            target.setStatus(r.getStatus());
            target.setNoIndex(r.getNoIndex());
            target.setNoFollow(r.getNoFollow());
            target.setSeoTitle(r.getSeoTitle());
            return null;
        }).when(mapper).updateEntity(any(PageRequest.class), any(Page.class));

        when(repository.save(any(Page.class))).thenAnswer(inv -> inv.getArgument(0));

        service = new PageServiceImpl(repository, mapper);
    }

    @Test
    void createDefaultsNoIndexAndNoFollowWhenOmitted() {
        PageRequest request = new PageRequest();
        request.setTitle("Test page");
        request.setSlug("test-page");
        request.setLocale(PageLocale.FR);
        request.setCompanyType(CompanyType.DUNES_INSOLITES);
        // noIndex/noFollow/status all deliberately left unset (null).

        service.createPage(request);

        // Only observable via the entity actually handed to save() -
        // the response DTO comes from the (mocked) mapper.toResponse,
        // not exercised here.
        var captor = org.mockito.ArgumentCaptor.forClass(Page.class);
        org.mockito.Mockito.verify(repository).save(captor.capture());
        Page saved = captor.getValue();

        assertThat(saved.getNoIndex()).isFalse();
        assertThat(saved.getNoFollow()).isFalse();
        assertThat(saved.getStatus()).isEqualTo(PageStatus.DRAFT);
    }

    @Test
    void updatePreservesExistingStatusWhenRequestOmitsIt() {
        UUID pageId = UUID.randomUUID();
        Page existing = Page.builder()
                .pageId(pageId)
                .title("Old title")
                .slug("existing-page")
                .locale(PageLocale.FR)
                .companyType(CompanyType.DUNES_INSOLITES)
                .status(PageStatus.PUBLISHED)
                .noIndex(false)
                .noFollow(false)
                .build();
        when(repository.findById(pageId)).thenReturn(Optional.of(existing));
        when(repository.existsBySlugAndLocaleAndCompanyTypeAndPageIdNot(
                any(), any(), any(), any())).thenReturn(false);

        PageRequest request = new PageRequest();
        request.setTitle("New title");
        request.setSlug("existing-page");
        request.setLocale(PageLocale.FR);
        request.setCompanyType(CompanyType.DUNES_INSOLITES);
        // status left null - an editor's form saving only content fields.

        service.updatePage(pageId, request);

        // The real assertion: a PUT that says nothing about status must
        // never silently unpublish a live page.
        assertThat(existing.getStatus()).isEqualTo(PageStatus.PUBLISHED);
        assertThat(existing.getNoIndex()).isFalse();
        assertThat(existing.getNoFollow()).isFalse();
    }
}
