package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.service.SiteImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Unauthenticated — /api/public/** is permitAll (SecurityConfig). Returns
 * only the slots support has replaced ({"images": {"home.hero": "/media/..."}});
 * the frontend keeps its built-in photo for every slot not listed here.
 */
@RestController
@RequestMapping("/api/public/site-images")
@RequiredArgsConstructor
public class PublicSiteImageController {

    private final SiteImageService siteImageService;

    @GetMapping
    public ResponseEntity<Map<String, Map<String, String>>> getImages() {
        return ResponseEntity.ok(Map.of("images", siteImageService.getPublicMap()));
    }
}
