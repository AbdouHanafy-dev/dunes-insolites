package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.ChauffeurRequest;
import com.camping.duneinsolite.dto.request.ChauffeurUpdateRequest;
import com.camping.duneinsolite.dto.response.ChauffeurResponse;
import com.camping.duneinsolite.service.ChauffeurService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chauffeurs")
@RequiredArgsConstructor
public class ChauffeurController {

    private final ChauffeurService chauffeurService;



    @GetMapping("/{id}")
    public ResponseEntity<ChauffeurResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(chauffeurService.getById(id));
    }

    @GetMapping("/reservation/{reservationId}")
    public ResponseEntity<List<ChauffeurResponse>> getByReservation(
            @PathVariable UUID reservationId) {
        return ResponseEntity.ok(chauffeurService.getByReservation(reservationId));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ChauffeurResponse> update(
            @PathVariable UUID id,
            @RequestBody ChauffeurUpdateRequest request) {
        return ResponseEntity.ok(chauffeurService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        chauffeurService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/reservation/{reservationId}")
    public ResponseEntity<Void> deleteAllByReservation(@PathVariable UUID reservationId) {
        chauffeurService.deleteAllByReservation(reservationId);
        return ResponseEntity.noContent().build();
    }
}