package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.ContentBlockRequest;
import com.camping.duneinsolite.dto.response.ContentBlockResponse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContentBlockService {
    ContentBlockResponse createBlock(ContentBlockRequest request);
    ContentBlockResponse getBlockById(UUID blockId);
    List<ContentBlockResponse> getAllBlocks();
    ContentBlockResponse updateBlock(UUID blockId, ContentBlockRequest request);
    void deleteBlock(UUID blockId);

    /** Vitrine/preview-facing: never throws on a missing id, just empty. */
    Optional<ContentBlockResponse> findById(UUID blockId);
}
