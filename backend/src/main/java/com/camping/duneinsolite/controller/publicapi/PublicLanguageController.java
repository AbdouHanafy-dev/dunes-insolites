package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.SpokenLanguageResponse;
import com.camping.duneinsolite.service.SpokenLanguageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Unauthenticated - see SecurityConfig, /api/public/** is permitAll. The
 * Tour booking form's "preferred language" multiselect needs this list
 * without a session, same as PublicSiteSettingsController. Only active
 * languages - a retired one shouldn't be pickable on a new booking, even
 * though existing Guides/Reservations referencing it are untouched.
 */
@RestController
@RequestMapping("/api/public/languages")
@RequiredArgsConstructor
public class PublicLanguageController {

    private final SpokenLanguageService spokenLanguageService;

    @GetMapping
    public ResponseEntity<List<SpokenLanguageResponse>> getActiveLanguages() {
        return ResponseEntity.ok(spokenLanguageService.getAllActive());
    }
}
