package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.CampingSettingsRequest;
import com.camping.duneinsolite.dto.response.CampingSettingsResponse;
import com.camping.duneinsolite.service.CampingSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/camping-settings")
@RequiredArgsConstructor
public class CampingSettingsController {

    private final CampingSettingsService campingSettingsService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CampingSettingsResponse> getSettings() {
        return ResponseEntity.ok(campingSettingsService.getSettings());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CampingSettingsResponse> updateSettings(
            @Valid @RequestBody CampingSettingsRequest request) {
        return ResponseEntity.ok(campingSettingsService.updateSettings(request));
    }
}
