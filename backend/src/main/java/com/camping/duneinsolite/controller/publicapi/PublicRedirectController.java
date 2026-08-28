package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.response.RedirectResponse;
import com.camping.duneinsolite.service.RedirectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Unauthenticated, full redirect list - see SecurityConfig, /api/public/**
 * is permitAll. The frontend's own middleware.ts fetches this (cached, not
 * per-request) and matches the incoming path before falling through to
 * normal routing. An empty list is a normal 200: no redirects configured
 * yet is not an error.
 */
@RestController
@RequestMapping("/api/public/redirects")
@RequiredArgsConstructor
public class PublicRedirectController {

    private final RedirectService redirectService;

    @GetMapping
    public ResponseEntity<List<RedirectResponse>> getRedirects() {
        return ResponseEntity.ok(redirectService.getPublicRedirects());
    }
}
