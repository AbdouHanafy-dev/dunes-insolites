package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ContentBlockRequest;
import com.camping.duneinsolite.dto.response.ContentBlockResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.ContentBlockMapper;
import com.camping.duneinsolite.model.ContentBlock;
import com.camping.duneinsolite.repository.ContentBlockRepository;
import com.camping.duneinsolite.service.ContentBlockService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ContentBlockServiceImpl implements ContentBlockService {

    private final ContentBlockRepository contentBlockRepository;
    private final ContentBlockMapper contentBlockMapper;

    @Override
    public ContentBlockResponse createBlock(ContentBlockRequest request) {
        ContentBlock block = contentBlockMapper.toEntity(request);
        return contentBlockMapper.toResponse(contentBlockRepository.save(block));
    }

    @Override
    @Transactional(readOnly = true)
    public ContentBlockResponse getBlockById(UUID blockId) {
        return contentBlockMapper.toResponse(findByIdOrThrow(blockId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContentBlockResponse> getAllBlocks() {
        return contentBlockRepository.findAllByOrderByLabelAsc().stream()
                .map(contentBlockMapper::toResponse).toList();
    }

    @Override
    public ContentBlockResponse updateBlock(UUID blockId, ContentBlockRequest request) {
        ContentBlock block = findByIdOrThrow(blockId);
        contentBlockMapper.updateEntity(request, block);
        return contentBlockMapper.toResponse(contentBlockRepository.save(block));
    }

    @Override
    public void deleteBlock(UUID blockId) {
        contentBlockRepository.delete(findByIdOrThrow(blockId));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ContentBlockResponse> findById(UUID blockId) {
        return contentBlockRepository.findById(blockId).map(contentBlockMapper::toResponse);
    }

    private ContentBlock findByIdOrThrow(UUID blockId) {
        return contentBlockRepository.findById(blockId)
                .orElseThrow(() -> new ResourceNotFoundException("Content block not found: " + blockId));
    }
}
