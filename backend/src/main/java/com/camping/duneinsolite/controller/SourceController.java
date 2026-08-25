package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.SourceRequest;
import com.camping.duneinsolite.dto.response.SourceResponse;
import com.camping.duneinsolite.service.SourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sources")
// Reference data read by the reservation form, so reads stay open to any
// authenticated caller. Writes are ADMIN - previously any logged-in CLIENT
// could create or delete a booking source.
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class SourceController {

    private final SourceService sourceService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<SourceResponse> create(@Valid @RequestBody SourceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sourceService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SourceResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(sourceService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<SourceResponse>> getAll() {
        return ResponseEntity.ok(sourceService.getAll());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<SourceResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody SourceRequest request) {
        return ResponseEntity.ok(sourceService.update(id, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        sourceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}