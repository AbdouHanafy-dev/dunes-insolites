package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.GuideRequest;
import com.camping.duneinsolite.dto.request.GuideUpdateRequest;
import com.camping.duneinsolite.dto.response.GuideResponse;
import com.camping.duneinsolite.service.GuideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/guides")
@RequiredArgsConstructor
public class GuideController {

    private final GuideService guideService;


    @GetMapping("/{id}")
    public ResponseEntity<GuideResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(guideService.getById(id));
    }

    @GetMapping("/reservation/{reservationId}")
    public ResponseEntity<List<GuideResponse>> getByReservation(
            @PathVariable UUID reservationId) {
        return ResponseEntity.ok(guideService.getByReservation(reservationId));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<GuideResponse> update(
            @PathVariable UUID id,
            @RequestBody GuideUpdateRequest request) {
        return ResponseEntity.ok(guideService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        guideService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/reservation/{reservationId}")
    public ResponseEntity<Void> deleteAllByReservation(@PathVariable UUID reservationId) {
        guideService.deleteAllByReservation(reservationId);
        return ResponseEntity.noContent().build();
    }
}