package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {
    List<MediaAsset> findAllByOrderByCreatedAtDesc();
}
