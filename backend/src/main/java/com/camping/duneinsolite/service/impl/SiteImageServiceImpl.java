package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.response.SiteImageResponse;
import com.camping.duneinsolite.exception.InvalidSiteImageException;
import com.camping.duneinsolite.model.SiteImage;
import com.camping.duneinsolite.repository.SiteImageRepository;
import com.camping.duneinsolite.service.SiteImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional
public class SiteImageServiceImpl implements SiteImageService {

    private static final Pattern KEY = Pattern.compile("^[a-z0-9]+([.-][a-z0-9]+)*$");
    private static final int MAX_KEY_LENGTH = 80;

    private final SiteImageRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<SiteImageResponse> getAll() {
        return repository.findAll().stream().map(SiteImageServiceImpl::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, String> getPublicMap() {
        Map<String, String> out = new LinkedHashMap<>();
        repository.findAll().forEach(i -> out.put(i.getImageKey(), i.getImageUrl()));
        return out;
    }

    @Override
    public SiteImageResponse set(String key, String url) {
        requireValidKey(key);
        String clean = url == null ? "" : url.trim();
        // Only a media-library path or a plain web address; never javascript:, data: and the like.
        if (!(clean.startsWith("/") && !clean.startsWith("//")) && !clean.matches("(?i)^https?://\\S+$")) {
            throw new InvalidSiteImageException("L'adresse de la photo n'est pas valide");
        }
        SiteImage image = repository.findById(key).orElseGet(() -> SiteImage.builder().imageKey(key).build());
        image.setImageUrl(clean);
        return toResponse(repository.save(image));
    }

    @Override
    public void reset(String key) {
        requireValidKey(key);
        repository.findById(key).ifPresent(repository::delete);
    }

    private static void requireValidKey(String key) {
        if (key == null || key.length() > MAX_KEY_LENGTH || !KEY.matcher(key).matches()) {
            throw new InvalidSiteImageException("Emplacement de photo inconnu");
        }
    }

    private static SiteImageResponse toResponse(SiteImage image) {
        return SiteImageResponse.builder()
                .key(image.getImageKey())
                .url(image.getImageUrl())
                .updatedAt(image.getUpdatedAt())
                .build();
    }
}
