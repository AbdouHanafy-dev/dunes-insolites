package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.publicapi.PublicGalleryItemResponse;
import com.camping.duneinsolite.service.GalleryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Unauthenticated — /api/public/** is permitAll (SecurityConfig). The
 * vitrine's homepage strip and /gallery page fetch this (cached, not
 * per-request). An empty list is a normal 200: no photos configured yet is
 * not an error.
 */
@RestController
@RequestMapping("/api/public/gallery")
@RequiredArgsConstructor
public class PublicGalleryController {

    private final GalleryService galleryService;

    @GetMapping
    public ResponseEntity<List<PublicGalleryItemResponse>> getGallery() {
        return ResponseEntity.ok(galleryService.getPublicGallery());
    }
}
