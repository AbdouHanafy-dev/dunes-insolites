package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.FavoriteRequest;
import com.camping.duneinsolite.dto.response.FavoriteResponse;
import com.camping.duneinsolite.exception.InvalidFavoriteException;
import com.camping.duneinsolite.model.Favorite;
import com.camping.duneinsolite.model.enums.FavoriteType;
import com.camping.duneinsolite.repository.FavoriteRepository;
import com.camping.duneinsolite.security.CallerContext;
import com.camping.duneinsolite.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional
public class FavoriteServiceImpl implements FavoriteService {

    /** Public slugs are lowercase words joined by hyphens (the legacy WordPress ones too). */
    private static final Pattern SLUG = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
    private static final int MAX_SLUG_LENGTH = 160;
    /** A generous ceiling that stops one account from filling the table. */
    static final int MAX_PER_USER = 200;

    private final FavoriteRepository repository;
    private final CallerContext caller;

    @Override
    @Transactional(readOnly = true)
    public List<FavoriteResponse> getMine() {
        return list(caller.requireUserId());
    }

    @Override
    public void add(FavoriteType type, String slug) {
        UUID userId = caller.requireUserId();
        saveIfNew(userId, type, slug);
    }

    @Override
    public void remove(FavoriteType type, String slug) {
        repository.deleteByUserIdAndItemTypeAndItemSlug(caller.requireUserId(), type, slug);
    }

    @Override
    public List<FavoriteResponse> merge(List<FavoriteRequest> items) {
        UUID userId = caller.requireUserId();
        // A bad entry in the browser's list is skipped, not fatal: the rest still merges.
        for (FavoriteRequest item : items) {
            if (item.getType() == null || !validSlug(item.getSlug())) continue;
            if (repository.countByUserId(userId) >= MAX_PER_USER) break;
            saveIfNew(userId, item.getType(), item.getSlug());
        }
        return list(userId);
    }

    private void saveIfNew(UUID userId, FavoriteType type, String slug) {
        if (type == null || !validSlug(slug)) {
            throw new InvalidFavoriteException("Favori invalide");
        }
        if (repository.existsByUserIdAndItemTypeAndItemSlug(userId, type, slug)) return;
        if (repository.countByUserId(userId) >= MAX_PER_USER) {
            throw new InvalidFavoriteException("Vous avez atteint le nombre maximum de favoris");
        }
        repository.save(Favorite.builder().userId(userId).itemType(type).itemSlug(slug).build());
    }

    private List<FavoriteResponse> list(UUID userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(f -> FavoriteResponse.builder()
                        .type(f.getItemType())
                        .slug(f.getItemSlug())
                        .createdAt(f.getCreatedAt())
                        .build())
                .toList();
    }

    private static boolean validSlug(String slug) {
        return slug != null && slug.length() <= MAX_SLUG_LENGTH && SLUG.matcher(slug).matches();
    }
}
