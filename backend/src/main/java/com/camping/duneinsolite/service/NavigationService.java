package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.NavigationItemRequest;
import com.camping.duneinsolite.dto.response.NavigationItemResponse;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageLocale;

import java.util.List;
import java.util.UUID;

public interface NavigationService {
    NavigationItemResponse createItem(NavigationItemRequest request);
    NavigationItemResponse getItemById(UUID navItemId);
    List<NavigationItemResponse> getAllItems();
    NavigationItemResponse updateItem(UUID navItemId, NavigationItemRequest request);
    void deleteItem(UUID navItemId);

    /** Vitrine-facing: ordered, ready to render as-is. */
    List<NavigationItemResponse> getPublicNavigation(PageLocale locale, CompanyType companyType);
}
