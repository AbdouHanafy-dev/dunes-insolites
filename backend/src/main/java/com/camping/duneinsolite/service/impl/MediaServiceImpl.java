package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.response.MediaAssetResponse;
import com.camping.duneinsolite.exception.InvalidUploadException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.MediaAsset;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.repository.MediaAssetRepository;
import com.camping.duneinsolite.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Local-disk storage — files live under `app.upload-dir` (default
 * "uploads", relative to wherever the backend process runs; gitignored,
 * see backend/.gitignore). Served back publicly via WebConfig's /media/**
 * static resource mapping, not through this service — Spring's static
 * handler gets caching/ETags/range-requests for free, a hand-rolled byte
 * stream wouldn't.
 *
 * The next rung, if this ever needs to run somewhere without a persistent
 * local disk (multiple app instances, ephemeral containers), is swapping
 * this implementation for one backed by object storage (S3-compatible) —
 * MediaService's interface doesn't assume local disk, only this class does.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class MediaServiceImpl implements MediaService {

    // Deliberately an allowlist, not a denylist — a media library for a
    // travel site's marketing content has no legitimate reason to accept
    // arbitrary file types, and rejecting by default is the safer failure
    // mode for a file-upload endpoint.
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"
    );
    private static final long MAX_SIZE_BYTES = 8L * 1024 * 1024; // 8 MB

    private final MediaAssetRepository mediaAssetRepository;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    private Path uploadPath() {
        Path path = Path.of(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(path);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create upload directory: " + path, e);
        }
        return path;
    }

    @Override
    public MediaAssetResponse upload(MultipartFile file, CompanyType companyType) {
        if (file == null || file.isEmpty()) {
            throw new InvalidUploadException("The uploaded file is empty.");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new InvalidUploadException("File exceeds the 8 MB limit.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new InvalidUploadException(
                    "Unsupported file type: " + contentType + ". Allowed: " + ALLOWED_MIME_TYPES);
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String extension = originalName.contains(".")
                ? originalName.substring(originalName.lastIndexOf('.'))
                : "";
        String storedFilename = UUID.randomUUID() + extension;

        try {
            Files.copy(file.getInputStream(), uploadPath().resolve(storedFilename));
        } catch (IOException e) {
            throw new UncheckedIOException("Could not save uploaded file", e);
        }

        MediaAsset asset = MediaAsset.builder()
                .filename(originalName)
                .storedFilename(storedFilename)
                .mimeType(contentType)
                .sizeBytes(file.getSize())
                .companyType(companyType)
                .build();

        return toResponse(mediaAssetRepository.save(asset));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MediaAssetResponse> getAllAssets() {
        return mediaAssetRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public void deleteAsset(UUID assetId) {
        MediaAsset asset = mediaAssetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Media asset not found: " + assetId));
        try {
            Files.deleteIfExists(uploadPath().resolve(asset.getStoredFilename()));
        } catch (IOException e) {
            throw new UncheckedIOException("Could not delete file for asset: " + assetId, e);
        }
        mediaAssetRepository.delete(asset);
    }

    // Deliberately relative ("/media/xyz.jpg", not a full origin) — this
    // service has no clean access to "what host was this request made to"
    // without dragging a servlet-layer concern into it. MediaController
    // rewrites it to an absolute URL before it ever leaves the backend, so
    // every caller (admin, the public API) gets a directly usable URL.
    private MediaAssetResponse toResponse(MediaAsset asset) {
        MediaAssetResponse response = new MediaAssetResponse();
        response.setAssetId(asset.getAssetId());
        response.setFilename(asset.getFilename());
        response.setMimeType(asset.getMimeType());
        response.setSizeBytes(asset.getSizeBytes());
        response.setUrl("/media/" + asset.getStoredFilename());
        response.setCompanyType(asset.getCompanyType());
        response.setCreatedAt(asset.getCreatedAt());
        return response;
    }
}
