package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.DriverProfileCreateRequest;
import com.camping.duneinsolite.dto.request.DriverProfileUpdateRequest;
import com.camping.duneinsolite.dto.response.DriverProfileResponse;
import com.camping.duneinsolite.service.DriverProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/driver-profiles")
@RequiredArgsConstructor
public class DriverProfileController {
    private final DriverProfileService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public List<DriverProfileResponse> getAll() {
        return service.getAll();
    }

    @PostMapping
    @PreAuthorize("@perm.can('USERS', 'FULL')")
    public ResponseEntity<DriverProfileResponse> create(@Valid @RequestBody DriverProfileCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("@perm.can('USERS', 'FULL')")
    public DriverProfileResponse update(@PathVariable UUID id, @Valid @RequestBody DriverProfileUpdateRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.can('USERS', 'FULL')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/invitation")
    @PreAuthorize("@perm.can('USERS', 'FULL')")
    public ResponseEntity<Void> resendInvitation(@PathVariable UUID id) {
        service.resendInvitation(id);
        return ResponseEntity.noContent().build();
    }
}
