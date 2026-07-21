package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.ExtraRequest;
import com.camping.duneinsolite.dto.response.ExtraResponse;
import com.camping.duneinsolite.service.ExtraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/extras")
@RequiredArgsConstructor
public class ExtraController {

    private final ExtraService extraService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<ExtraResponse> createExtra(@Valid @RequestBody ExtraRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(extraService.createExtra(request));
    }

    @GetMapping("/{extraId}")
    public ResponseEntity<ExtraResponse> getExtraById(@PathVariable UUID extraId) {
        return ResponseEntity.ok(extraService.getExtraById(extraId));
    }

    @GetMapping
    public ResponseEntity<List<ExtraResponse>> getAllExtras() {
        return ResponseEntity.ok(extraService.getAllExtras());
    }

    // Client/Partenaire calls this to populate the dropdown when creating a reservation
    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ExtraResponse>> getActiveExtras() {
        return ResponseEntity.ok(extraService.getActiveExtras());
    }

    @PutMapping("/{extraId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<ExtraResponse> updateExtra(@PathVariable UUID extraId,
                                                     @Valid @RequestBody ExtraRequest request) {
        return ResponseEntity.ok(extraService.updateExtra(extraId, request));
    }

    @DeleteMapping("/{extraId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteExtra(@PathVariable UUID extraId) {
        extraService.deleteExtra(extraId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{extraId}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExtraResponse> deactivateExtra(@PathVariable UUID extraId) {
        return ResponseEntity.ok(extraService.deactivateExtra(extraId));
    }
}