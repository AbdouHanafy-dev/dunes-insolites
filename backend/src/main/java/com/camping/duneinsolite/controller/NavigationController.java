package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.NavigationItemRequest;
import com.camping.duneinsolite.dto.response.NavigationItemResponse;
import com.camping.duneinsolite.service.NavigationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Content management — the vitrine's top navigation, per locale/company.
 * ADMIN-only, same as PageController. No draft/publish workflow — see
 * NavigationItem's own doc comment for why.
 */
@RestController
@RequestMapping("/api/navigation")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class NavigationController {

    private final NavigationService navigationService;

    @PostMapping
    public ResponseEntity<NavigationItemResponse> createItem(@Valid @RequestBody NavigationItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(navigationService.createItem(request));
    }

    @GetMapping("/{navItemId}")
    public ResponseEntity<NavigationItemResponse> getItemById(@PathVariable UUID navItemId) {
        return ResponseEntity.ok(navigationService.getItemById(navItemId));
    }

    @GetMapping
    public ResponseEntity<List<NavigationItemResponse>> getAllItems() {
        return ResponseEntity.ok(navigationService.getAllItems());
    }

    @PutMapping("/{navItemId}")
    public ResponseEntity<NavigationItemResponse> updateItem(
            @PathVariable UUID navItemId, @Valid @RequestBody NavigationItemRequest request) {
        return ResponseEntity.ok(navigationService.updateItem(navItemId, request));
    }

    @DeleteMapping("/{navItemId}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID navItemId) {
        navigationService.deleteItem(navItemId);
        return ResponseEntity.noContent().build();
    }
}
