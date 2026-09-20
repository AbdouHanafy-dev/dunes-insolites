package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.GuideProfileCreateRequest;
import com.camping.duneinsolite.dto.request.GuideProfileUpdateRequest;
import com.camping.duneinsolite.dto.response.GuideProfileResponse;
import com.camping.duneinsolite.service.GuideProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/guide-profiles")
@RequiredArgsConstructor
public class GuideProfileController {
    private final GuideProfileService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public List<GuideProfileResponse> getAll() {
        return service.getAll();
    }

    @PostMapping
    @PreAuthorize("@perm.can('USERS', 'FULL')")
    public ResponseEntity<GuideProfileResponse> create(@Valid @RequestBody GuideProfileCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("@perm.can('USERS', 'FULL')")
    public GuideProfileResponse update(@PathVariable UUID id, @Valid @RequestBody GuideProfileUpdateRequest request) {
        return service.update(id, request);
    }
}
