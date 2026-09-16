package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.SiteSettingsResponse;
import com.camping.duneinsolite.service.SiteSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Unauthenticated - see SecurityConfig, /api/public/** is permitAll.
 * Every visitor's page render needs these (phone/email/whatsapp/social/
 * headline stats), so this can't require a session the way
 * SiteSettingsController's admin-facing GET does. Nothing here is
 * sensitive - it's exactly what already renders in the site's own footer.
 */
@RestController
@RequestMapping("/api/public/site-settings")
@RequiredArgsConstructor
public class PublicSiteSettingsController {

    private final SiteSettingsService siteSettingsService;

    @GetMapping
    public ResponseEntity<SiteSettingsResponse> getSettings() {
        return ResponseEntity.ok(siteSettingsService.getSettings());
    }
}
