package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.dto.PageBlockDto;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageCategory;
import com.camping.duneinsolite.model.enums.PageLocale;
import com.camping.duneinsolite.model.enums.PageStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class PageRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Slug is required")
    private String slug;

    @NotNull(message = "Locale is required")
    private PageLocale locale;

    @NotNull(message = "Company is required")
    private CompanyType companyType;

    private PageStatus status;

    // Null = ordinary static page. See PageCategory's own comment.
    private PageCategory category;

    // SEO
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
}
