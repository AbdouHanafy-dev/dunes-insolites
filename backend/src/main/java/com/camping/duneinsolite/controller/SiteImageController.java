package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.SiteImageRequest;
import com.camping.duneinsolite.dto.response.SiteImageResponse;
import com.camping.duneinsolite.service.SiteImageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Back-office management of the site's replaceable photo slots. No
 * class-level URL rule (falls through to authenticated), so every method is
 * narrowed by the MEDIA permission — the same one that guards the media
 * library. The public read is GET /api/public/site-images.
 */
@RestController
@RequestMapping("/api/site-images")
@RequiredArgsConstructor
public class SiteImageController {

    private final SiteImageService siteImageService;

    @GetMapping
    @PreAuthorize("@perm.can('MEDIA', 'READ')")
    public ResponseEntity<List<SiteImageResponse>> getAll() {
        return ResponseEntity.ok(siteImageService.getAll());
    }

    @PutMapping("/{key}")
    @PreAuthorize("@perm.can('MEDIA', 'EDIT')")
    public ResponseEntity<SiteImageResponse> set(@PathVariable String key, @Valid @RequestBody SiteImageRequest request) {
        return ResponseEntity.ok(siteImageService.set(key, request.getUrl()));
    }

    @DeleteMapping("/{key}")
    @PreAuthorize("@perm.can('MEDIA', 'EDIT')")
    public ResponseEntity<Void> reset(@PathVariable String key) {
        siteImageService.reset(key);
        return ResponseEntity.noContent().build();
    }
}
