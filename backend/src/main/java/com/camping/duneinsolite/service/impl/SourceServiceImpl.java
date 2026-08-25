package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.SourceRequest;
import com.camping.duneinsolite.dto.response.SourceResponse;
import com.camping.duneinsolite.mapper.SourceMapper;
import com.camping.duneinsolite.model.Source;
import com.camping.duneinsolite.repository.SourceRepository;
import com.camping.duneinsolite.service.SourceService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SourceServiceImpl implements SourceService {

    private final SourceRepository sourceRepository;
    private final SourceMapper sourceMapper;

    @Override
    @Transactional
    public SourceResponse create(SourceRequest request) {
        Source source = sourceMapper.toEntity(request);
        return sourceMapper.toResponse(sourceRepository.save(source));
    }

    @Override
    @Transactional(readOnly = true)
    public SourceResponse getById(UUID id) {
        return sourceMapper.toResponse(findOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SourceResponse> getAll() {
        return sourceRepository.findAll()
                .stream()
                .map(sourceMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public SourceResponse update(UUID id, SourceRequest request) {
        Source source = findOrThrow(id);
        sourceMapper.updateEntity(request, source);
        return sourceMapper.toResponse(sourceRepository.save(source));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Source source = findOrThrow(id);
        sourceRepository.delete(source);
    }

    private Source findOrThrow(UUID id) {
        return sourceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Source not found: " + id));
    }
}