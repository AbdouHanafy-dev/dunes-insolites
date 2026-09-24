package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.GalleryImageRequest;
import com.camping.duneinsolite.dto.request.ReorderRequest;
import com.camping.duneinsolite.dto.response.GalleryImageResponse;
import com.camping.duneinsolite.service.GalleryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Content management — the vitrine photo gallery. Same shape as
 * RedirectController / NavigationController: no class-level URL rule (falls
 * through to anyRequest().authenticated()), each method narrowed via the
 * AdminResource.GALLERY permission matrix. The public read is a separate,
 * unauthenticated endpoint — see PublicGalleryController.
 */
@RestController
@RequestMapping("/api/gallery")
@RequiredArgsConstructor
public class GalleryController {

    private final GalleryService galleryService;

    @PostMapping
    @PreAuthorize("@perm.can('GALLERY', 'FULL')")
    public ResponseEntity<GalleryImageResponse> create(@Valid @RequestBody GalleryImageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(galleryService.create(request));
    }

    @GetMapping("/{galleryItemId}")
    @PreAuthorize("@perm.can('GALLERY', 'READ')")
    public ResponseEntity<GalleryImageResponse> getById(@PathVariable UUID galleryItemId) {
        return ResponseEntity.ok(galleryService.getById(galleryItemId));
    }

    @GetMapping
    @PreAuthorize("@perm.can('GALLERY', 'READ')")
    public ResponseEntity<List<GalleryImageResponse>> getAll() {
        return ResponseEntity.ok(galleryService.getAll());
    }

    @PutMapping("/{galleryItemId}")
    @PreAuthorize("@perm.can('GALLERY', 'EDIT')")
    public ResponseEntity<GalleryImageResponse> update(
            @PathVariable UUID galleryItemId, @Valid @RequestBody GalleryImageRequest request) {
        return ResponseEntity.ok(galleryService.update(galleryItemId, request));
    }

    // Drag-and-drop order; the public gallery reads position ascending.
    @PutMapping("/order")
    @PreAuthorize("@perm.can('GALLERY', 'EDIT')")
    public ResponseEntity<Void> reorder(@Valid @RequestBody ReorderRequest request) {
        galleryService.reorder(request.getIds());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{galleryItemId}")
    @PreAuthorize("@perm.can('GALLERY', 'FULL')")
    public ResponseEntity<Void> delete(@PathVariable UUID galleryItemId) {
        galleryService.delete(galleryItemId);
        return ResponseEntity.noContent().build();
    }
}
