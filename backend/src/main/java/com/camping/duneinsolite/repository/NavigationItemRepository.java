package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.NavigationItem;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageLocale;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NavigationItemRepository extends JpaRepository<NavigationItem, UUID> {

    List<NavigationItem> findAllByOrderByLocaleAscDisplayOrderAsc();

    List<NavigationItem> findByLocaleAndCompanyTypeOrderByDisplayOrderAsc(
            PageLocale locale, CompanyType companyType);

    boolean existsByUrlAndLocaleAndCompanyType(String url, PageLocale locale, CompanyType companyType);
}
