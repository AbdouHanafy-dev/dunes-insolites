package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ExtraRequest;
import com.camping.duneinsolite.dto.response.ExtraResponse;
import com.camping.duneinsolite.mapper.ExtraMapper;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.enums.ProductType;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.ReviewRepository;
import com.camping.duneinsolite.repository.UserProductRemiseRepository;
import com.camping.duneinsolite.service.ExtraService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ExtraServiceImpl implements ExtraService {

    private final ExtraRepository extraRepository;
    private final ExtraMapper extraMapper;
    private final UserProductRemiseRepository userProductRemiseRepository;
    private final ReviewRepository reviewRepository;

    @Override
    public ExtraResponse createExtra(ExtraRequest request) {
        return extraMapper.toResponse(extraRepository.save(extraMapper.toEntity(request)));
    }

    @Override
    @Transactional(readOnly = true)
    public ExtraResponse getExtraById(UUID extraId) {
        return extraMapper.toResponse(findById(extraId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExtraResponse> getAllExtras() {
        return extraRepository.findAll().stream().map(extraMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExtraResponse> getActiveExtras() {
        return extraRepository.findByIsActiveTrue().stream().map(extraMapper::toResponse).toList();
    }

    @Override
    public ExtraResponse updateExtra(UUID extraId, ExtraRequest request) {
        Extra extra = findById(extraId);
        extraMapper.updateEntity(request, extra);
        return extraMapper.toResponse(extraRepository.save(extra));
    }

    @Override
    public ExtraResponse deactivateExtra(UUID extraId) {
        Extra extra = findById(extraId);
        extra.setIsActive(false);
        return extraMapper.toResponse(extraRepository.save(extra));
    }

    @Override
    public void deleteExtra(UUID extraId) {
        userProductRemiseRepository.deleteAllByProductId(extraId);
        reviewRepository.deleteAllByProductIdAndProductType(extraId, ProductType.EXTRA);
        extraRepository.delete(findById(extraId));
    }

    private Extra findById(UUID extraId) {
        return extraRepository.findById(extraId)
                .orElseThrow(() -> new RuntimeException("Extra not found: " + extraId));
    }
}