package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.RedirectRequest;
import com.camping.duneinsolite.dto.response.RedirectResponse;
import com.camping.duneinsolite.service.RedirectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Content management — 301/302 redirects for URLs that have moved. See
 * Redirect's own doc comment for how this differs from the DI-022 legacy
 * WordPress rewrites. ADMIN-only, same as PageController/NavigationController.
 */
// Was a single class-level @PreAuthorize("hasRole('ADMIN')") - see
// PageController's own comment for why this moved to per-method @perm
// checks. CAMPING/PARTENAIRE seed at NONE, matching today exactly.
@RestController
@RequestMapping("/api/redirects")
@RequiredArgsConstructor
public class RedirectController {

    private final RedirectService redirectService;

    @PostMapping
    @PreAuthorize("@perm.can('REDIRECTS', 'FULL')")
    public ResponseEntity<RedirectResponse> createRedirect(@Valid @RequestBody RedirectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(redirectService.createRedirect(request));
    }

    @GetMapping("/{redirectId}")
    @PreAuthorize("@perm.can('REDIRECTS', 'READ')")
    public ResponseEntity<RedirectResponse> getRedirectById(@PathVariable UUID redirectId) {
        return ResponseEntity.ok(redirectService.getRedirectById(redirectId));
    }

    @GetMapping
    @PreAuthorize("@perm.can('REDIRECTS', 'READ')")
    public ResponseEntity<List<RedirectResponse>> getAllRedirects() {
        return ResponseEntity.ok(redirectService.getAllRedirects());
    }

    @PutMapping("/{redirectId}")
    @PreAuthorize("@perm.can('REDIRECTS', 'EDIT')")
    public ResponseEntity<RedirectResponse> updateRedirect(
            @PathVariable UUID redirectId, @Valid @RequestBody RedirectRequest request) {
        return ResponseEntity.ok(redirectService.updateRedirect(redirectId, request));
    }

    @DeleteMapping("/{redirectId}")
    @PreAuthorize("@perm.can('REDIRECTS', 'FULL')")
    public ResponseEntity<Void> deleteRedirect(@PathVariable UUID redirectId) {
        redirectService.deleteRedirect(redirectId);
        return ResponseEntity.noContent().build();
    }
}
