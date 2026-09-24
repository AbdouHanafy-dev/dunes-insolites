package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.FavoriteMergeRequest;
import com.camping.duneinsolite.dto.response.FavoriteResponse;
import com.camping.duneinsolite.model.enums.FavoriteType;
import com.camping.duneinsolite.service.FavoriteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * A customer's saved items. Every endpoint works on the caller's own list
 * only — the user comes from the JWT (see FavoriteServiceImpl), so there is
 * no id in the URL to tamper with. Any logged-in user may have favourites,
 * hence isAuthenticated() rather than a permission-matrix resource.
 */
@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    public ResponseEntity<List<FavoriteResponse>> getMine() {
        return ResponseEntity.ok(favoriteService.getMine());
    }

    @PutMapping("/{type}/{slug}")
    public ResponseEntity<Void> add(@PathVariable FavoriteType type, @PathVariable String slug) {
        favoriteService.add(type, slug);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{type}/{slug}")
    public ResponseEntity<Void> remove(@PathVariable FavoriteType type, @PathVariable String slug) {
        favoriteService.remove(type, slug);
        return ResponseEntity.noContent().build();
    }

    /** Called once after login: folds the browser's saved items into the account's list. */
    @PostMapping("/merge")
    public ResponseEntity<List<FavoriteResponse>> merge(@Valid @RequestBody FavoriteMergeRequest request) {
        return ResponseEntity.ok(favoriteService.merge(request.getItems()));
    }
}
