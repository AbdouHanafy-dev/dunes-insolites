package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.dto.PageBlockDto;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageLocale;
import com.camping.duneinsolite.model.enums.PageStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class PageResponse {
    private UUID pageId;
    private String title;
    private String slug;
    private PageLocale locale;
    private CompanyType companyType;
    private PageStatus status;
    private LocalDateTime publishedAt;

    private String seoTitle;
    private String metaDescription;
    private String focusKeyword;
    private String canonicalUrl;
    private Boolean noIndex;
    private Boolean noFollow;
    private String ogTitle;
    private String ogDescription;
    private String ogImageUrl;

    private List<PageBlockDto> blocks;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
