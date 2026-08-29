package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Page;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageCategory;
import com.camping.duneinsolite.model.enums.PageLocale;
import com.camping.duneinsolite.model.enums.PageStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PageRepository extends JpaRepository<Page, UUID> {

    List<Page> findAllByOrderByUpdatedAtDesc();

    Optional<Page> findBySlugAndLocaleAndCompanyType(String slug, PageLocale locale, CompanyType companyType);

    boolean existsBySlugAndLocaleAndCompanyTypeAndPageIdNot(
            String slug, PageLocale locale, CompanyType companyType, UUID pageId);

    boolean existsBySlugAndLocaleAndCompanyType(String slug, PageLocale locale, CompanyType companyType);

    List<Page> findBySlugAndCompanyTypeOrderByLocale(String slug, CompanyType companyType);

    List<Page> findByStatus(PageStatus status);

    // Powers the vitrine's /guides index - every published GUIDE-category
    // page in one locale/company, so a new admin-authored article shows up
    // there with no frontend code change.
    List<Page> findByCategoryAndStatusAndLocaleAndCompanyTypeOrderByPublishedAtDesc(
            PageCategory category, PageStatus status, PageLocale locale, CompanyType companyType);
}
