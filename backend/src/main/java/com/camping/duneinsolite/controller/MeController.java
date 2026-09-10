package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.response.UserDataExport;
import com.camping.duneinsolite.service.UserDataExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Self-service endpoints for the authenticated account holder — "my own data",
 * never anyone else's. Ownership is the JWT subject, resolved server-side in
 * {@code UserDataExportService} via {@code CallerContext}.
 */
@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class MeController {

    private final UserDataExportService userDataExportService;

    /**
     * GDPR Art. 15 / Art. 20 — a machine-readable copy of everything the
     * platform holds about the caller. JSON; contains no credentials, tokens
     * or other users' data (see {@code UserDataExport}).
     */
    @GetMapping("/export")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDataExport> exportMyData() {
        UserDataExport export = userDataExportService.exportForCurrentUser();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("my-data.json").build().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .body(export);
    }
}
