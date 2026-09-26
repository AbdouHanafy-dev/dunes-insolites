package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.PromoCodeRequest;
import com.camping.duneinsolite.dto.response.PromoCodeResponse;
import com.camping.duneinsolite.service.PromoCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** The partner promo codes and what each one brought in. ADMIN only (also by the /api/admin/** rule). */
@RestController
@RequestMapping("/api/admin/promo-codes")
@RequiredArgsConstructor
public class AdminPromoCodeController {

    private final PromoCodeService promoCodeService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PromoCodeResponse>> list() {
        return ResponseEntity.ok(promoCodeService.listWithStats());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromoCodeResponse> create(@Valid @RequestBody PromoCodeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(promoCodeService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PromoCodeResponse> update(@PathVariable UUID id, @Valid @RequestBody PromoCodeRequest request) {
        return ResponseEntity.ok(promoCodeService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        promoCodeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
