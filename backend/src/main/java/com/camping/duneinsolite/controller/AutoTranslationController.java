package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.AutoTranslateRequest;
import com.camping.duneinsolite.dto.response.AutoTranslateResponse;
import com.camping.duneinsolite.service.AutoTranslationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Backoffice "translate" button. ADMIN only, declared here and by the /api/admin/** rule. */
@RestController
@RequiredArgsConstructor
public class AutoTranslationController {

    private final AutoTranslationService autoTranslationService;

    @PostMapping("/api/admin/translations/auto")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AutoTranslateResponse> translate(@Valid @RequestBody AutoTranslateRequest request) {
        return ResponseEntity.ok(autoTranslationService.translate(request));
    }
}
