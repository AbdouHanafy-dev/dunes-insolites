package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.NavigationItemResponse;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageLocale;
import com.camping.duneinsolite.service.NavigationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Unauthenticated, ordered nav items for one locale/company — see
 * SecurityConfig, /api/public/** is permitAll. An empty list (no items
 * configured for that locale/company yet) is a normal 200, not a 404 - the
 * vitrine falls back to its own hardcoded nav either way.
 */
@RestController
@RequestMapping("/api/public/navigation")
@RequiredArgsConstructor
public class PublicNavigationController {

    private final NavigationService navigationService;

    @GetMapping
    public ResponseEntity<List<NavigationItemResponse>> getNavigation(
            @RequestParam(defaultValue = "FR") PageLocale locale,
            @RequestParam(defaultValue = "DUNES_INSOLITES") CompanyType companyType) {
        return ResponseEntity.ok(navigationService.getPublicNavigation(locale, companyType));
    }
}
