package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.PageRequest;
import com.camping.duneinsolite.dto.response.PageResponse;
import com.camping.duneinsolite.service.PageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Content management — Pages, each with its own SEO metadata and an ordered
 * list of content blocks (Payload-style page builder). ADMIN-only: this is
 * an internal content/marketing tool, not something CAMPING/PARTENAIRE
 * staff need.
 */
@RestController
@RequestMapping("/api/pages")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class PageController {

    private final PageService pageService;

    @PostMapping
    public ResponseEntity<PageResponse> createPage(@Valid @RequestBody PageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pageService.createPage(request));
    }

    @GetMapping("/{pageId}")
    public ResponseEntity<PageResponse> getPageById(@PathVariable UUID pageId) {
        return ResponseEntity.ok(pageService.getPageById(pageId));
    }

    @GetMapping
    public ResponseEntity<List<PageResponse>> getAllPages() {
        return ResponseEntity.ok(pageService.getAllPages());
    }

    @PutMapping("/{pageId}")
    public ResponseEntity<PageResponse> updatePage(
            @PathVariable UUID pageId, @Valid @RequestBody PageRequest request) {
        return ResponseEntity.ok(pageService.updatePage(pageId, request));
    }

    @DeleteMapping("/{pageId}")
    public ResponseEntity<Void> deletePage(@PathVariable UUID pageId) {
        pageService.deletePage(pageId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{pageId}/publish")
    public ResponseEntity<PageResponse> publishPage(@PathVariable UUID pageId) {
        return ResponseEntity.ok(pageService.publishPage(pageId));
    }

    @PatchMapping("/{pageId}/unpublish")
    public ResponseEntity<PageResponse> unpublishPage(@PathVariable UUID pageId) {
        return ResponseEntity.ok(pageService.unpublishPage(pageId));
    }
}
