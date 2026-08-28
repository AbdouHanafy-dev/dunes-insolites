package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.NavigationItemRequest;
import com.camping.duneinsolite.dto.response.NavigationItemResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.NavigationItemMapper;
import com.camping.duneinsolite.model.NavigationItem;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.NavMenuType;
import com.camping.duneinsolite.model.enums.PageLocale;
import com.camping.duneinsolite.repository.NavigationItemRepository;
import com.camping.duneinsolite.service.NavigationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NavigationServiceImpl implements NavigationService {

    private final NavigationItemRepository navigationItemRepository;
    private final NavigationItemMapper navigationItemMapper;

    @Override
    public NavigationItemResponse createItem(NavigationItemRequest request) {
        NavigationItem item = navigationItemMapper.toEntity(request);
        if (item.getDisplayOrder() == null) item.setDisplayOrder(0);
        if (item.getMenuType() == null) item.setMenuType(NavMenuType.NONE);
        return navigationItemMapper.toResponse(navigationItemRepository.save(item));
    }

    @Override
    @Transactional(readOnly = true)
    public NavigationItemResponse getItemById(UUID navItemId) {
        return navigationItemMapper.toResponse(findById(navItemId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<NavigationItemResponse> getAllItems() {
        return navigationItemRepository.findAllByOrderByLocaleAscDisplayOrderAsc().stream()
                .map(navigationItemMapper::toResponse).toList();
    }

    @Override
    public NavigationItemResponse updateItem(UUID navItemId, NavigationItemRequest request) {
        NavigationItem item = findById(navItemId);
        navigationItemMapper.updateEntity(request, item);
        return navigationItemMapper.toResponse(navigationItemRepository.save(item));
    }

    @Override
    public void deleteItem(UUID navItemId) {
        navigationItemRepository.delete(findById(navItemId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<NavigationItemResponse> getPublicNavigation(PageLocale locale, CompanyType companyType) {
        return navigationItemRepository
                .findByLocaleAndCompanyTypeOrderByDisplayOrderAsc(locale, companyType).stream()
                .map(navigationItemMapper::toResponse).toList();
    }

    private NavigationItem findById(UUID navItemId) {
        return navigationItemRepository.findById(navItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Navigation item not found: " + navItemId));
    }
}
