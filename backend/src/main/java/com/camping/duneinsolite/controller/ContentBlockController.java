package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.ContentBlockRequest;
import com.camping.duneinsolite.dto.response.ContentBlockResponse;
import com.camping.duneinsolite.service.ContentBlockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Content management — reusable content blocks, referenced by Pages via a
 * "blockReference" PageBlock instead of duplicated inline. ADMIN-only,
 * same as PageController/NavigationController.
 */
// Was a single class-level @PreAuthorize("hasRole('ADMIN')") - see
// PageController's own comment for why this moved to per-method @perm
// checks. CAMPING/PARTENAIRE seed at NONE, matching today exactly.
@RestController
@RequestMapping("/api/content-blocks")
@RequiredArgsConstructor
public class ContentBlockController {

    private final ContentBlockService contentBlockService;

    @PostMapping
    @PreAuthorize("@perm.can('CONTENT_BLOCKS', 'FULL')")
    public ResponseEntity<ContentBlockResponse> createBlock(@Valid @RequestBody ContentBlockRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contentBlockService.createBlock(request));
    }

    @GetMapping("/{blockId}")
    @PreAuthorize("@perm.can('CONTENT_BLOCKS', 'READ')")
    public ResponseEntity<ContentBlockResponse> getBlockById(@PathVariable UUID blockId) {
        return ResponseEntity.ok(contentBlockService.getBlockById(blockId));
    }

    @GetMapping
    @PreAuthorize("@perm.can('CONTENT_BLOCKS', 'READ')")
    public ResponseEntity<List<ContentBlockResponse>> getAllBlocks() {
        return ResponseEntity.ok(contentBlockService.getAllBlocks());
    }

    @PutMapping("/{blockId}")
    @PreAuthorize("@perm.can('CONTENT_BLOCKS', 'EDIT')")
    public ResponseEntity<ContentBlockResponse> updateBlock(
            @PathVariable UUID blockId, @Valid @RequestBody ContentBlockRequest request) {
        return ResponseEntity.ok(contentBlockService.updateBlock(blockId, request));
    }

    @DeleteMapping("/{blockId}")
    @PreAuthorize("@perm.can('CONTENT_BLOCKS', 'FULL')")
    public ResponseEntity<Void> deleteBlock(@PathVariable UUID blockId) {
        contentBlockService.deleteBlock(blockId);
        return ResponseEntity.noContent().build();
    }
}
