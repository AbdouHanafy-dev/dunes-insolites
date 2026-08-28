package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.response.MediaAssetResponse;
import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;
import java.util.UUID;

/**
 * Content management — the media library. ADMIN-only, same as the other
 * content collections. Files themselves are served publicly (see
 * WebConfig's /media/** mapping, SecurityConfig's matching permitAll) —
 * only managing the library (upload/list/delete) requires auth.
 */
@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class MediaController {

    private final MediaService mediaService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<MediaAssetResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "DUNES_INSOLITES") CompanyType companyType) {
        return ResponseEntity.status(HttpStatus.CREATED).body(absolute(mediaService.upload(file, companyType)));
    }

    @GetMapping
    public ResponseEntity<List<MediaAssetResponse>> getAllAssets() {
        return ResponseEntity.ok(mediaService.getAllAssets().stream().map(this::absolute).toList());
    }

    @DeleteMapping("/{assetId}")
    public ResponseEntity<Void> deleteAsset(@PathVariable UUID assetId) {
        mediaService.deleteAsset(assetId);
        return ResponseEntity.noContent().build();
    }

    /** Rewrites the service's relative "/media/xyz.jpg" into an absolute
     *  URL against whatever host this request actually came in on. */
    private MediaAssetResponse absolute(MediaAssetResponse response) {
        response.setUrl(ServletUriComponentsBuilder.fromCurrentContextPath().path(response.getUrl()).toUriString());
        return response;
    }
}
