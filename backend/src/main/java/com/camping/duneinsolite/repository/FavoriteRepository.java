package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Favorite;
import com.camping.duneinsolite.model.enums.FavoriteType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {

    List<Favorite> findByUserIdOrderByCreatedAtDesc(UUID userId);

    boolean existsByUserIdAndItemTypeAndItemSlug(UUID userId, FavoriteType itemType, String itemSlug);

    long deleteByUserIdAndItemTypeAndItemSlug(UUID userId, FavoriteType itemType, String itemSlug);

    long countByUserId(UUID userId);
}
